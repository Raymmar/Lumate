import { lumaApiRequest } from '../routes';
import { storage } from '../storage';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
import { users, userPeopleLinks, cacheMetadata } from '@shared/schema';
import { EventEmitter } from 'events';
import { LumaMembershipService } from './LumaMembershipService';
import { syncStatusService } from './SyncStatusService';
import { automaticSyncsEnabled, shouldStartAutomaticSync } from './automaticSyncPolicy';

interface ExistingUser {
  id: number;
  email: string;
  personId: number | null;
  emailDriftDetectedAt: string | null;
}

interface ExistingLink {
  userId: number;
  personId: number;
}

export class CacheService extends EventEmitter {
  private static instance: CacheService;
  private cacheInterval: NodeJS.Timeout | null = null;
  private isCaching = false;
  private readonly BATCH_SIZE = 50;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;
  private lastSuccessfulSync: Date | null = null;
  private readonly SYNC_INTERVAL = 6 * 60 * 60 * 1000;
  private readonly FULL_PEOPLE_REFRESH_INTERVAL = 24 * 60 * 60 * 1000;
  private readonly FULL_PEOPLE_REFRESH_KEY = 'last_full_people_refresh';
  // When a sync is due at startup, wait briefly so the server can answer its first requests.
  private readonly STARTUP_SYNC_DELAY = 30 * 1000;
  // Incremental people syncs re-read people created shortly before the last sync,
  // so clock skew or a sync that overlapped a sign-up can't drop anyone.
  private readonly PEOPLE_INCREMENTAL_OVERLAP = 60 * 60 * 1000;
  private initialSyncTimer: NodeJS.Timeout | null = null;
  private nextSyncAt: Date | null = null;

  private constructor() {
    super();
    this.logSync('Starting CacheService...');
    if (shouldStartAutomaticSync('CacheService')) {
      this.startSync({ startup: true });
    }
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new CacheService();
    }
    return this.instance;
  }

  private logSync(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    console.log(`[CacheService] ${timestamp} - ${message}`, data ? data : '');
    this.emit('fetchProgress', {
      type: 'status',
      message: `${message}${data ? ': ' + JSON.stringify(data) : ''}`,
      progress: undefined
    });
  }

  /**
   * Starts the sync schedule. On server startup the first sync is skipped when the
   * last successful sync is newer than the normal interval; the schedule then picks
   * up where it left off. A forced (manual) start always syncs right away, with a
   * full people refresh.
   */
  private startSync(options: { startup?: boolean; forceFull?: boolean } = {}) {
    const now = new Date();
    this.logSync('Starting sync service...', {
      startTime: now.toISOString()
    });

    this.clearSchedule();

    if (options.startup) {
      this.scheduleStartupSync().catch(err => {
        this.logSync('Could not check last sync time at startup, syncing now:', err);
        this.beginSchedule(0);
      });
      return;
    }

    this.beginSchedule(0, { forceFullPeople: options.forceFull });
  }

  private clearSchedule() {
    if (this.initialSyncTimer) {
      clearTimeout(this.initialSyncTimer);
      this.initialSyncTimer = null;
    }
    if (this.cacheInterval) {
      clearInterval(this.cacheInterval);
      this.cacheInterval = null;
      this.logSync('Cleared existing sync interval');
    }
    this.nextSyncAt = null;
  }

  private async scheduleStartupSync() {
    const lastUpdate = await storage.getLastCacheUpdate();
    const sinceLast = lastUpdate ? Date.now() - lastUpdate.getTime() : NaN;

    if (lastUpdate && sinceLast >= 0 && sinceLast < this.SYNC_INTERVAL) {
      const delay = this.SYNC_INTERVAL - sinceLast;
      const nextSync = new Date(Date.now() + delay);
      console.log(
        `[CacheService] Skipping startup Luma sync: last successful sync was ${Math.round(sinceLast / 60000)} min ago ` +
        `(${lastUpdate.toISOString()}), within the ${this.SYNC_INTERVAL / 3600000}h sync interval. ` +
        `Next scheduled sync at ${nextSync.toISOString()}.`
      );
      this.beginSchedule(delay);
      return;
    }

    this.logSync(`Luma sync is due at startup (last successful sync: ${lastUpdate ? lastUpdate.toISOString() : 'never'}); starting in ${this.STARTUP_SYNC_DELAY / 1000}s`);
    this.beginSchedule(this.STARTUP_SYNC_DELAY);
  }

  /** Runs the first sync after `initialDelay`, then every SYNC_INTERVAL. */
  private beginSchedule(initialDelay: number, firstRun: { forceFullPeople?: boolean } = {}) {
    const runFirst = () => {
      this.initialSyncTimer = null;
      this.logSync('Running initial sync...');
      this.updateCache(firstRun).catch(err => {
        this.logSync('Initial sync failed:', err);
      });

      // A deliberate admin refresh remains available, but must not opt the
      // preview into recurring external work as a side effect.
      if (!automaticSyncsEnabled()) {
        this.nextSyncAt = null;
        this.logSync('Manual sync started; recurring sync remains disabled outside production');
        return;
      }

      this.cacheInterval = setInterval(() => {
        const currentTime = new Date();
        this.nextSyncAt = new Date(currentTime.getTime() + this.SYNC_INTERVAL);
        this.logSync('Interval triggered', {
          currentTime: currentTime.toISOString(),
          isCaching: this.isCaching
        });

        if (!this.isCaching) {
          this.logSync('Starting 6-hour sync...');
          this.updateCache().catch(err => {
            this.logSync('6-hour sync failed:', err);
          });
        } else {
          this.logSync('Previous sync still in progress, skipping this interval');
        }
      }, this.SYNC_INTERVAL);

      if (this.cacheInterval.ref) {
        this.cacheInterval.ref();
      }

      this.nextSyncAt = new Date(Date.now() + this.SYNC_INTERVAL);
      this.logSync('Sync scheduler started', {
        interval: `${this.SYNC_INTERVAL / 1000 / 60} minutes`,
        nextSync: this.nextSyncAt.toISOString()
      });
    };

    if (initialDelay <= 0) {
      runFirst();
    } else {
      this.nextSyncAt = new Date(Date.now() + initialDelay);
      this.initialSyncTimer = setTimeout(runFirst, initialDelay);
    }
  }


  private emitProgress(message: string, progress: number) {
    console.log(`[CacheService] Progress: ${message} (${progress}%)`);
    this.emit('fetchProgress', {
      type: 'progress',
      message,
      progress: Math.min(Math.round(progress), 100)
    });
  }

  private async getLastFullPeopleRefresh(): Promise<Date | null> {
    try {
      const result = await db
        .select()
        .from(cacheMetadata)
        .where(eq(cacheMetadata.key, this.FULL_PEOPLE_REFRESH_KEY))
        .limit(1);

      if (result.length === 0) return null;
      const parsed = new Date(result[0].value);
      if (isNaN(parsed.getTime())) {
        this.logSync('Invalid last_full_people_refresh timestamp in cache_metadata, treating as null');
        return null;
      }
      return parsed;
    } catch (error) {
      this.logSync('Failed to get last full people refresh timestamp:', error);
      return null;
    }
  }

  private async setLastFullPeopleRefresh(date: Date): Promise<void> {
    try {
      await db
        .insert(cacheMetadata)
        .values({
          key: this.FULL_PEOPLE_REFRESH_KEY,
          value: date.toISOString(),
        })
        .onConflictDoUpdate({
          target: cacheMetadata.key,
          set: {
            value: date.toISOString(),
            updatedAt: new Date().toISOString(),
          }
        });
    } catch (error) {
      this.logSync('Failed to set last full people refresh timestamp:', error);
    }
  }

  private async shouldDoFullPeopleRefresh(): Promise<boolean> {
    const lastRefresh = await this.getLastFullPeopleRefresh();
    if (!lastRefresh) return true;
    return (Date.now() - lastRefresh.getTime()) > this.FULL_PEOPLE_REFRESH_INTERVAL;
  }

  async forceSync() {
    this.logSync('Force sync requested');
    try {
      await db.execute(sql`
        INSERT INTO settings (key, value) 
        VALUES ('last_cache_update', '1970-01-01T00:00:00.000Z')
        ON CONFLICT (key) DO UPDATE 
        SET value = EXCLUDED.value, 
            updated_at = CURRENT_TIMESTAMP
      `);

      this.isCaching = false;

      // Manual trigger: sync now and re-read every person from Luma
      this.startSync({ forceFull: true });

      return true;
    } catch (error) {
      this.logSync('Force sync failed:', error);
      throw error;
    }
  }

  private async updateCache(options: { forceFullPeople?: boolean } = {}) {
    if (this.isCaching) {
      this.logSync('Cache update already in progress, skipping...');
      return;
    }

    this.isCaching = true;
    syncStatusService.startSync('cache');
    const syncStartTime = Date.now();
    this.logSync('Starting cache update process...');
    this.emitProgress('Starting cache update process...', 0);

    try {
      const lastUpdate = await storage.getLastCacheUpdate();
      this.logSync(`Last cache update was`, lastUpdate);

      const now = new Date();
      const lastUpdateTime = lastUpdate || new Date(0);

      const doFullPeopleRefresh = options.forceFullPeople || await this.shouldDoFullPeopleRefresh();
      const peopleLastUpdateTime = doFullPeopleRefresh ? new Date(0) : lastUpdateTime;

      if (doFullPeopleRefresh) {
        this.logSync(options.forceFullPeople
          ? 'Full people refresh triggered (manual sync)'
          : 'Full people refresh triggered (>24h since last full refresh)');
      }

      this.emitProgress('Fetching events and people from Luma API...', 10);
      this.logSync('Fetching events and people from Luma API...');

      const [events, people] = await Promise.all([
        this.fetchAllEvents(lastUpdateTime),
        this.fetchAllPeople(peopleLastUpdateTime)
      ]);

      this.logSync(`Successfully fetched data from API`, {
        eventsCount: events.length,
        peopleCount: people.length,
        fullPeopleRefresh: doFullPeopleRefresh
      });

      this.emitProgress(`Successfully fetched ${events.length} events and ${people.length} people from API`, 50);

      if (events.length > 0) {
        this.logSync(`Processing ${events.length} events in batches...`);
        this.emitProgress(`Processing ${events.length} events...`, 60);

        for (let i = 0; i < events.length; i += this.BATCH_SIZE) {
          const batch = events.slice(i, i + this.BATCH_SIZE);
          await this.batchInsertEvents(batch);
          const progress = 60 + (i / events.length) * 20;
          this.logSync(`Processed events batch ${Math.floor(i / this.BATCH_SIZE) + 1} of ${Math.ceil(events.length / this.BATCH_SIZE)}`);
          this.emitProgress(
            `Processed events batch ${Math.floor(i / this.BATCH_SIZE) + 1} of ${Math.ceil(events.length / this.BATCH_SIZE)}`,
            progress
          );
        }
      }

      await this.syncSummitEventDetails();

      if (people.length > 0) {
        this.logSync(`Processing ${people.length} people in batches...`);
        this.emitProgress(`Processing ${people.length} people...`, 80);

        const existingUsers: ExistingUser[] = await db
          .select({ id: users.id, email: users.email, personId: users.personId, emailDriftDetectedAt: users.emailDriftDetectedAt })
          .from(users);

        const existingLinks: ExistingLink[] = await db
          .select({ userId: userPeopleLinks.userId, personId: userPeopleLinks.personId })
          .from(userPeopleLinks);

        const linkedPersonIds = new Set(existingLinks.map(l => l.personId));

        this.logSync(`Loaded ${existingUsers.length} users and ${existingLinks.length} existing person links for relationship matching`);

        for (let i = 0; i < people.length; i += this.BATCH_SIZE) {
          const batch = people.slice(i, i + this.BATCH_SIZE);
          await this.batchInsertPeople(batch, existingUsers, linkedPersonIds);
          const progress = 80 + (i / people.length) * 15;
          this.logSync(`Processed people batch ${Math.floor(i / this.BATCH_SIZE) + 1} of ${Math.ceil(people.length / this.BATCH_SIZE)}`);
          this.emitProgress(
            `Processed people batch ${Math.floor(i / this.BATCH_SIZE) + 1} of ${Math.ceil(people.length / this.BATCH_SIZE)}`,
            progress
          );
        }
      }

      this.emitProgress('Reconciling Luma memberships (bidirectional)...', 96);
      try {
        const reconcileResult = await LumaMembershipService.reconcileMemberships();
        this.logSync(`Luma reconciliation complete: ${reconcileResult.pushedToLuma} pushed, ${reconcileResult.pulledFromLuma} pulled, ${reconcileResult.removedFromLuma} removed, ${reconcileResult.stripeStatusUpdated} stripe statuses corrected, ${reconcileResult.errors} errors`);
      } catch (reconcileError) {
        this.logSync('Luma membership reconciliation failed (non-fatal):', reconcileError);
      }

      await storage.setLastCacheUpdate(now);
      this.lastSuccessfulSync = now;

      if (doFullPeopleRefresh) {
        await this.setLastFullPeopleRefresh(now);
      }

      const totalDuration = (Date.now() - syncStartTime) / 1000;
      const finalMessage = `Cache update completed in ${totalDuration}s. Processed ${events.length} events and ${people.length} people.${doFullPeopleRefresh ? ' (full people refresh)' : ''}`;
      this.logSync(finalMessage);

      this.emit('fetchProgress', {
        type: 'complete',
        message: finalMessage,
        progress: 100,
        data: {
          eventCount: events.length,
          peopleCount: people.length,
          duration: totalDuration
        }
      });

    } catch (error) {
      this.logSync('Cache update process failed:', error);
      this.emit('fetchProgress', {
        type: 'error',
        message: error instanceof Error ? error.message : String(error),
        progress: 0
      });
      throw error;
    } finally {
      this.isCaching = false;
      syncStatusService.endSync('cache');
    }
  }

  getLastSuccessfulSync() {
    return this.lastSuccessfulSync;
  }

  private async fetchWithRetry(endpoint: string, params: Record<string, string>): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        this.logSync(`API Request attempt ${attempt}/${this.MAX_RETRIES} for ${endpoint}`, {
          params,
          attempt
        });

        const response = await lumaApiRequest(endpoint, params);

        this.logSync(`API Response success for ${endpoint}`, {
          hasEntries: response?.entries?.length > 0,
          entriesCount: response?.entries?.length,
          hasMore: response?.has_more,
          nextCursor: response?.next_cursor
        });

        return response;
      } catch (error) {
        this.logSync(`API Request failed for ${endpoint} (attempt ${attempt}/${this.MAX_RETRIES})`, {
          error: error instanceof Error ? error.message : String(error),
          params
        });

        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.MAX_RETRIES) {
          const delay = this.RETRY_DELAY * attempt;
          this.logSync(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error(`Failed to fetch ${endpoint} after ${this.MAX_RETRIES} attempts`);
  }

  private async fetchAllEvents(lastUpdateTime: Date): Promise<any[]> {
    this.logSync('Starting fetch of events from Luma API...', {
      lastUpdateTime: lastUpdateTime.toISOString()
    });

    const allEvents: any[] = [];
    const seenEventIds = new Set<string>();
    let hasMore = true;
    let nextCursor: string | null = null;
    let pageCount = 0;

    while (hasMore) {
      const params: Record<string, string> = {
        pagination_limit: String(this.BATCH_SIZE),
        created_after: lastUpdateTime.toISOString()
      };

      if (nextCursor) {
        params.pagination_cursor = nextCursor;
      }

      try {
        pageCount++;
        this.logSync(`Fetching events page ${pageCount}`, params);

        const response = await this.fetchWithRetry('calendar/list-events', params);

        if (!response || !Array.isArray(response.entries)) {
          this.logSync('Invalid API response format for events', response);
          throw new Error('Invalid API response format');
        }

        const events = response.entries;
        this.logSync(`Received ${events.length} events in page ${pageCount}`);

        const uniqueEvents = events.filter((entry: any) => {
          if (!entry || !entry.event || !entry.event.api_id) {
            this.logSync('Invalid event entry structure:', entry);
            return false;
          }

          const eventData = entry.event;
          const isNew = !seenEventIds.has(eventData.api_id);
          if (isNew) {
            seenEventIds.add(eventData.api_id);
          }
          return isNew;
        });

        allEvents.push(...uniqueEvents);
        this.logSync(`Added ${uniqueEvents.length} unique events`, {
          total: allEvents.length,
          page: pageCount
        });

        hasMore = response.has_more === true;
        nextCursor = response.next_cursor;

        if (!hasMore || !nextCursor) {
          this.logSync(`No more events to fetch after ${pageCount} pages`);
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        this.logSync(`Error fetching events page ${pageCount}:`, error);
        throw error;
      }
    }

    this.logSync(`Completed events fetch`, {
      totalUniqueEvents: allEvents.length,
      totalPages: pageCount
    });

    return allEvents;
  }

  /**
   * Luma ignores `created_after` on list-people, so an incremental sync asks for
   * the newest people first and stops paging once it reaches people created
   * before the last sync (minus a safety overlap). A full refresh (first run,
   * daily refresh, or manual sync) pages through everyone.
   */
  private async fetchAllPeople(lastUpdateTime: Date): Promise<any[]> {
    const isFullRefresh = lastUpdateTime.getTime() === 0;
    const cutoff = isFullRefresh ? null : new Date(lastUpdateTime.getTime() - this.PEOPLE_INCREMENTAL_OVERLAP);
    this.logSync('Starting fetch of people from Luma API...', {
      lastUpdateTime: lastUpdateTime.toISOString(),
      isFullRefresh,
      ...(cutoff ? { createdOnOrAfter: cutoff.toISOString() } : {})
    });

    const allPeople: any[] = [];
    const seenPeopleIds = new Set<string>();
    let hasMore = true;
    let nextCursor: string | null = null;
    let pageCount = 0;
    let reachedSyncedPeople = false;

    while (hasMore) {
      const params: Record<string, string> = {
        pagination_limit: String(this.BATCH_SIZE),
      };

      if (cutoff) {
        params.sort_column = 'created_at';
        params.sort_direction = 'desc';
      }

      if (nextCursor) {
        params.pagination_cursor = nextCursor;
      }

      try {
        pageCount++;
        this.logSync(`Fetching people page ${pageCount}`, params);

        const response = await this.fetchWithRetry('calendar/list-people', params);

        if (!response || !Array.isArray(response.entries)) {
          this.logSync('Invalid API response format for people', response);
          throw new Error('Invalid API response format');
        }

        const people = response.entries;
        this.logSync(`Received ${people.length} people in page ${pageCount} `);

        const uniquePeople = people.filter((person: any) => {
          if (!person || !person.api_id) {
            this.logSync('Invalid person entry structure:', person);
            return false;
          }

          if (cutoff && person.created_at) {
            const createdAt = new Date(person.created_at);
            if (!isNaN(createdAt.getTime()) && createdAt < cutoff) {
              reachedSyncedPeople = true;
              return false;
            }
          }

          const isNew = !seenPeopleIds.has(person.api_id);
          if (isNew) {
            seenPeopleIds.add(person.api_id);
          }
          return isNew;
        });

        allPeople.push(...uniquePeople);
        this.logSync(`Added ${uniquePeople.length} unique people`, {
          total: allPeople.length,
          page: pageCount
        });

        if (reachedSyncedPeople) {
          this.logSync(`Reached people created before ${cutoff!.toISOString()} on page ${pageCount}; stopping incremental fetch`);
          break;
        }

        hasMore = response.has_more === true;
        nextCursor = response.next_cursor;

        if (!hasMore || !nextCursor) {
          this.logSync(`No more people to fetch after ${pageCount} pages`);
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        this.logSync(`Error fetching people page ${pageCount}:`, error);
        throw error;
      }
    }

    this.logSync(`Completed people fetch`, {
      totalUniquePeople: allPeople.length,
      totalPages: pageCount,
      isFullRefresh
    });

    return allPeople;
  }

  /**
   * Luma's event list omits descriptions, so fetch them for events linked to a
   * summit page. Failures are logged and don't stop the sync.
   */
  private async syncSummitEventDetails(): Promise<void> {
    try {
      const linked = await db.execute(
        sql`SELECT DISTINCT luma_event_api_id AS api_id FROM summits WHERE luma_event_api_id IS NOT NULL`,
      );
      for (const row of linked.rows as { api_id: string }[]) {
        try {
          const response = await lumaApiRequest('event/get', { api_id: row.api_id });
          const event = response?.event;
          if (!event) continue;
          await db.execute(
            sql`UPDATE events SET description = ${event.description || null} WHERE api_id = ${row.api_id}`,
          );
        } catch (error) {
          this.logSync(`Failed to fetch details for summit event ${row.api_id}:`, error);
        }
      }
    } catch (error) {
      this.logSync('Failed to sync summit event details:', error);
    }
  }

  private async batchInsertEvents(events: any[]): Promise<void> {
    if (events.length === 0) return;

    try {
      await db.transaction(async (tx) => {
        for (const entry of events) {
          const eventData = entry.event;

          const location = eventData.geo_address_json ? {
            city: eventData.geo_address_json.city,
            region: eventData.geo_address_json.region,
            country: eventData.geo_address_json.country,
            latitude: eventData.geo_latitude,
            longitude: eventData.geo_longitude,
            full_address: eventData.geo_address_json.full_address,
            // Luma's place name, e.g. "Mote Science Education Aquarium (SEA)"
            venue_name: eventData.geo_address_json.address || undefined,
          } : null;

          const query = sql`
            INSERT INTO events (
              api_id, title, description, start_time, end_time,
              cover_url, url, timezone, location, visibility,
              meeting_url, calendar_api_id, created_at
            ) 
            VALUES (
              ${eventData.api_id}, 
              ${eventData.name}, 
              ${eventData.description || null}, 
              ${eventData.start_at}, 
              ${eventData.end_at},
              ${eventData.cover_url || null}, 
              ${eventData.url || null}, 
              ${eventData.timezone || null}, 
              ${location ? JSON.stringify(location) : null}::jsonb, 
              ${eventData.visibility || null}, 
              ${eventData.meeting_url || eventData.zoom_meeting_url || null}, 
              ${eventData.calendar_api_id || null}, 
              ${eventData.created_at || null}
            )
            ON CONFLICT (api_id) DO UPDATE SET
              title = EXCLUDED.title,
              -- The list endpoint has no description; keep the one fetched for summit-linked events
              description = COALESCE(EXCLUDED.description, events.description),
              start_time = EXCLUDED.start_time,
              end_time = EXCLUDED.end_time,
              cover_url = EXCLUDED.cover_url,
              url = EXCLUDED.url,
              timezone = EXCLUDED.timezone,
              location = EXCLUDED.location,
              visibility = EXCLUDED.visibility,
              meeting_url = EXCLUDED.meeting_url,
              calendar_api_id = EXCLUDED.calendar_api_id,
              created_at = EXCLUDED.created_at
          `;

          await tx.execute(query);
        }
      });
    } catch (error) {
      this.logSync('Failed to batch insert events:', error);
      throw error;
    }
  }

  private async batchInsertPeople(
    people: any[],
    existingUsers: ExistingUser[],
    linkedPersonIds: Set<number>
  ): Promise<void> {
    if (people.length === 0) return;

    let processed = 0;
    let skipped = 0;
    let emailDriftDetected = 0;

    for (const person of people) {
      try {
        const membershipStatus = person.membership?.status || null;
        const membershipTierId = person.membership?.calendar_membership_tier_id || null;
        const revenueUsdCents = person.revenue_usd_cents || 0;

        const query = sql`
          INSERT INTO people (
            api_id, email, user_name, full_name, avatar_url,
            role, phone_number, bio, created_at,
            luma_membership_status, luma_membership_tier_id, revenue_usd_cents
          )
          VALUES (
            ${person.api_id},
            ${person.email},
            ${person.userName || person.user?.name || null},
            ${person.fullName || person.user?.full_name || null},
            ${person.avatarUrl || person.user?.avatar_url || null},
            ${person.role || null},
            ${person.phoneNumber || person.user?.phone_number || null},
            ${person.bio || person.user?.bio || null},
            ${person.created_at || null},
            ${membershipStatus},
            ${membershipTierId},
            ${revenueUsdCents}
          )
          ON CONFLICT (api_id) DO UPDATE SET
            email = EXCLUDED.email,
            user_name = EXCLUDED.user_name,
            full_name = EXCLUDED.full_name,
            avatar_url = EXCLUDED.avatar_url,
            role = EXCLUDED.role,
            phone_number = EXCLUDED.phone_number,
            bio = EXCLUDED.bio,
            created_at = EXCLUDED.created_at,
            luma_membership_status = EXCLUDED.luma_membership_status,
            luma_membership_tier_id = EXCLUDED.luma_membership_tier_id,
            revenue_usd_cents = EXCLUDED.revenue_usd_cents
          RETURNING *
        `;

        const result = await db.execute(query);
        const insertedPerson = result.rows[0] as { id: number; email: string };

        if (linkedPersonIds.has(insertedPerson.id)) {
          const linkedUser = existingUsers.find(u => u.personId === insertedPerson.id);
          if (linkedUser) {
            if (linkedUser.email.toLowerCase() !== insertedPerson.email.toLowerCase()) {
              emailDriftDetected++;
              this.logSync(`[Email Drift] Person ${person.api_id} (${insertedPerson.email}) is linked to user ${linkedUser.email} — emails no longer match`, {
                personId: insertedPerson.id,
                personEmail: insertedPerson.email,
                userId: linkedUser.id,
                userEmail: linkedUser.email,
              });
              await db.execute(sql`
                UPDATE users
                SET email_drift_detected_at = COALESCE(email_drift_detected_at, NOW()),
                    email_drift_person_email = ${insertedPerson.email},
                    email_drift_admin_dismissed_at = NULL
                WHERE id = ${linkedUser.id}
              `);
            } else if (linkedUser.emailDriftDetectedAt) {
              await db.execute(sql`
                UPDATE users
                SET email_drift_detected_at = NULL,
                    email_drift_person_email = NULL,
                    email_drift_admin_dismissed_at = NULL
                WHERE id = ${linkedUser.id}
              `);
              this.logSync(`[Email Drift Resolved] User ${linkedUser.email} drift cleared — emails match again`);
            }
          }
        } else {
          const matchingUser = existingUsers.find(user =>
            user.email.toLowerCase() === person.email.toLowerCase()
          );

          if (matchingUser) {
            this.logSync(`Linking user ${matchingUser.email} with person ${person.email}`);
            await db.execute(sql`
              UPDATE users 
              SET person_id = ${insertedPerson.id} 
              WHERE id = ${matchingUser.id}
            `);
            await db.execute(sql`
              INSERT INTO user_people_links (user_id, person_id, is_primary, linked_at)
              VALUES (${matchingUser.id}, ${insertedPerson.id}, true, NOW())
              ON CONFLICT (user_id, person_id) DO NOTHING
            `);
            linkedPersonIds.add(insertedPerson.id);
            matchingUser.personId = insertedPerson.id;
          }
        }

        processed++;
      } catch (error) {
        skipped++;
        this.logSync(`[Skipped] Failed to process person ${person.api_id} (${person.email}):`, error);
      }
    }

    if (skipped > 0) {
      this.logSync(`People batch complete: ${processed} processed, ${skipped} skipped due to errors`);
    }
    if (emailDriftDetected > 0) {
      this.logSync(`[Email Drift] Detected ${emailDriftDetected} people with email changes that don't match their linked user account`);
    }
  }

  async startCaching() {
      this.logSync('Starting cache service...');
      try {
          await this.updateCache();
          this.logSync('Initial cache update completed successfully');
      } catch (error) {
          this.logSync('Failed to start cache service:', error);
          throw error;
      }
  }


  getNextSyncTime() {
    return this.nextSyncAt;
  }

  stopCaching() {
    this.clearSchedule();
    this.isCaching = false;
    this.logSync('Cache service stopped');
  }
}
