import { lumaApiRequest } from '../routes';
import { storage } from '../storage';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { users } from '@shared/schema';
import { EventEmitter } from 'events';

export class CacheService extends EventEmitter {
  private static instance: CacheService;
  private cacheInterval: NodeJS.Timeout | null = null;
  private isCaching = false;
  private readonly BATCH_SIZE = 50;  // Luma API's pagination limit
  private readonly MAX_RETRIES = 3;  // Maximum number of retries for failed requests
  private readonly RETRY_DELAY = 1000;  // Delay between retries in milliseconds
  private lastSuccessfulSync: Date | null = null;

  private constructor() {
    super();
    console.log('[CacheService] Starting CacheService...');
    this.startCaching();
  }

  static getInstance() {
    if (!this.instance) {
      console.log('[CacheService] Creating new CacheService instance...');
      this.instance = new CacheService();
    }
    return this.instance;
  }

  private emitProgress(message: string, progress: number) {
    console.log(`[CacheService] Progress: ${message} (${progress}%)`);
    this.emit('fetchProgress', {
      message,
      progress: Math.min(Math.round(progress), 100)
    });
  }

  private logSync(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    console.log(`[CacheService] ${timestamp} - ${message}`, data ? data : '');
  }

  async updateCache() {
    if (this.isCaching) {
      this.logSync('Cache update already in progress, skipping...');
      return;
    }

    this.isCaching = true;
    const syncStartTime = Date.now();
    this.logSync('Starting cache update process...');
    this.emitProgress('Starting cache update process...', 0);

    try {
      const lastUpdate = await storage.getLastCacheUpdate();
      this.logSync(`Last cache update was`, lastUpdate);

      // If we're doing a fresh sync after reset, fetch everything
      const now = new Date();
      const lastUpdateTime = lastUpdate || new Date(0); // Use epoch time for fresh sync

      // First fetch all data from Luma API
      this.emitProgress('Fetching events and people from Luma API...', 10);
      this.logSync('Fetching events and people from Luma API...');

      const [events, people] = await Promise.all([
        this.fetchAllEvents(lastUpdateTime),
        this.fetchAllPeople(lastUpdateTime)
      ]);

      this.logSync(`Successfully fetched data from API`, {
        eventsCount: events.length,
        peopleCount: people.length
      });

      this.emitProgress(`Successfully fetched ${events.length} events and ${people.length} people from API`, 50);

      // Process events in batches
      if (events.length > 0) {
        this.logSync(`Processing ${events.length} events in batches...`);
        this.emitProgress(`Processing ${events.length} events...`, 60);

        for (let i = 0; i < events.length; i += this.BATCH_SIZE) {
          const batch = events.slice(i, i + this.BATCH_SIZE);
          await this.batchInsertEvents(batch);
          const progress = 60 + (i / events.length) * 20;
          this.logSync(`Processed events batch ${Math.floor(i / this.BATCH_SIZE) + 1} of ${Math.ceil(events.length / this.BATCH_SIZE)}`);
          this.emitProgress(
            `Processed events batch ${i / this.BATCH_SIZE + 1} of ${Math.ceil(events.length / this.BATCH_SIZE)}`,
            progress
          );
        }
      }

      // Process people in batches while preserving email relationships
      if (people.length > 0) {
        this.logSync(`Processing ${people.length} people in batches...`);
        this.emitProgress(`Processing ${people.length} people...`, 80);

        for (let i = 0; i < people.length; i += this.BATCH_SIZE) {
          const batch = people.slice(i, i + this.BATCH_SIZE);
          await this.batchInsertPeople(batch);
          const progress = 80 + (i / people.length) * 15;
          this.logSync(`Processed people batch ${Math.floor(i / this.BATCH_SIZE) + 1} of ${Math.ceil(people.length / this.BATCH_SIZE)}`);
          this.emitProgress(
            `Processed people batch ${i / this.BATCH_SIZE + 1} of ${Math.ceil(people.length / this.BATCH_SIZE)}`,
            progress
          );
        }
      }

      // Verify the sync was successful
      const [eventCount, peopleCount] = await Promise.all([
        storage.getEventCount(),
        storage.getPeopleCount()
      ]);

      if (eventCount === 0 || peopleCount === 0) {
        throw new Error(`Sync verification failed: Expected non-zero counts, got events=${eventCount}, people=${peopleCount}`);
      }

      // Update the last cache time
      await storage.setLastCacheUpdate(now);
      this.lastSuccessfulSync = now;

      const totalDuration = (Date.now() - syncStartTime) / 1000;
      const finalMessage = `Cache update completed in ${totalDuration}s. Processed ${events.length} events and ${people.length} people.`;
      this.logSync(finalMessage);
      this.emitProgress(finalMessage, 100);

    } catch (error) {
      this.logSync('Cache update process failed:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        this.emitProgress(`Error: ${error.message}`, 0);
      }
      throw error;
    } finally {
      this.isCaching = false;
    }
  }

  getLastSuccessfulSync() {
    return this.lastSuccessfulSync;
  }

  private async fetchWithRetry(endpoint: string, params: Record<string, string>): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await lumaApiRequest(endpoint, params);
      } catch (error) {
        this.logSync(`Attempt ${attempt} failed for ${endpoint}:`, error);
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
    this.logSync('Starting fetch of events from Luma API...');
    this.logSync('Using created_after:', lastUpdateTime.toISOString());

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
        this.logSync(`Fetching events page ${pageCount} with params:`, params);
        const response = await this.fetchWithRetry('calendar/list-events', params);

        if (!response || !Array.isArray(response.entries)) {
          this.logSync('Invalid response format:', response);
          throw new Error('Invalid API response format');
        }

        const events = response.entries;
        this.logSync(`Received ${events.length} events in page ${pageCount}`);

        // Process events
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
        this.logSync(`Added ${uniqueEvents.length} unique events (Total: ${allEvents.length}, Page: ${pageCount})`);

        hasMore = response.has_more === true;
        nextCursor = response.next_cursor;

        if (!hasMore || !nextCursor) {
          this.logSync(`No more events to fetch after ${pageCount} pages`);
          break;
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        this.logSync(`Error fetching events page ${pageCount}:`, error);
        throw error;
      }
    }

    this.logSync(`Completed events fetch. Total unique events: ${allEvents.length} from ${pageCount} pages`);
    return allEvents;
  }

  private async fetchAllPeople(lastUpdateTime: Date): Promise<any[]> {
    this.logSync('Starting fetch of people from Luma API...');
    this.logSync('Using created_after:', lastUpdateTime.toISOString());

    const allPeople: any[] = [];
    const seenPeopleIds = new Set<string>();
    let hasMore = true;
    let nextCursor: string | null = null;
    let pageCount = 0;

    while (hasMore || nextCursor) { //Fixed Pagination Logic
      const params: Record<string, string> = {
        pagination_limit: String(this.BATCH_SIZE),
        created_after: lastUpdateTime.toISOString()
      };

      if (nextCursor) {
        params.pagination_cursor = nextCursor;
      }

      try {
        pageCount++;
        this.logSync(`Fetching people page ${pageCount} with params:`, params);
        const response = await this.fetchWithRetry('calendar/list-people', params);

        if (!response || !Array.isArray(response.entries)) {
          this.logSync('Invalid response format:', response);
          throw new Error('Invalid API response format');
        }

        const people = response.entries;
        this.logSync(`Received ${people.length} people in page ${pageCount}`);

        // Process people
        const uniquePeople = people.filter((person: any) => {
          if (!person || !person.api_id) {
            this.logSync('Invalid person entry structure:', person);
            return false;
          }

          const isNew = !seenPeopleIds.has(person.api_id);
          if (isNew) {
            seenPeopleIds.add(person.api_id);
          }
          return isNew;
        });

        allPeople.push(...uniquePeople);
        this.logSync(`Added ${uniquePeople.length} unique people (Total: ${allPeople.length}, Page: ${pageCount})`);

        // Check for more pages
        this.logSync('Pagination metadata:', {
          hasMore: response.has_more,
          nextCursor: response.next_cursor,
          currentTotal: allPeople.length
        });

        hasMore = response.has_more === true;
        nextCursor = response.next_cursor;

        if (!hasMore && !nextCursor) {
          this.logSync(`No more people to fetch after ${pageCount} pages`);
          break;
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        this.logSync(`Error fetching people page ${pageCount}:`, error);
        throw error;
      }
    }

    this.logSync(`Completed people fetch. Total unique people: ${allPeople.length} from ${pageCount} pages`);
    return allPeople;
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
          } : null;

          // Use SQL template for better control over the insert/update
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
              description = EXCLUDED.description,
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

  private async batchInsertPeople(people: any[]): Promise<void> {
    if (people.length === 0) return;

    try {
      await db.transaction(async (tx) => {
        // Get existing users to maintain email relationships
        const existingUsers = await db.select().from(users);
        this.logSync(`Found ${existingUsers.length} existing users to maintain relationships with`);

        for (const person of people) {
          try {
            // Insert/update person
            const query = sql`
              INSERT INTO people (
                api_id, email, user_name, full_name, avatar_url,
                role, phone_number, bio, organization_name, job_title, created_at
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
                ${person.organizationName || person.user?.organization_name || null},
                ${person.jobTitle || person.user?.job_title || null},
                ${person.created_at || null}
              )
              ON CONFLICT (api_id) DO UPDATE SET
                email = EXCLUDED.email,
                user_name = EXCLUDED.user_name,
                full_name = EXCLUDED.full_name,
                avatar_url = EXCLUDED.avatar_url,
                role = EXCLUDED.role,
                phone_number = EXCLUDED.phone_number,
                bio = EXCLUDED.bio,
                organization_name = EXCLUDED.organization_name,
                job_title = EXCLUDED.job_title,
                created_at = EXCLUDED.created_at
              RETURNING *
            `;

            const result = await tx.execute(query);
            const insertedPerson = result.rows[0];

            // Find any user with matching email and update the relationship
            const matchingUser = existingUsers.find(user => 
              user.email.toLowerCase() === person.email.toLowerCase()
            );

            if (matchingUser) {
              this.logSync(`Relinking user ${matchingUser.email} with person ${person.email}`);
              await tx.execute(sql`
                UPDATE users 
                SET person_id = ${insertedPerson.id} 
                WHERE id = ${matchingUser.id}
              `);
            }
          } catch (error) {
            this.logSync(`Failed to process person ${person.api_id}:`, error);
            throw error;
          }
        }
      });

      this.logSync(`Successfully processed ${people.length} people`);
    } catch (error) {
      this.logSync('Failed to batch insert people:', error);
      throw error;
    }
  }

  startCaching() {
    const FOUR_HOURS = 4 * 60 * 60 * 1000;
    this.cacheInterval = setInterval(() => {
      this.logSync('Running scheduled cache update...');
      this.updateCache().catch(error => {
        this.logSync('Scheduled cache update failed:', error);
      });
    }, FOUR_HOURS);

    this.logSync('Running initial cache update...');
    this.updateCache().catch(error => {
      this.logSync('Initial cache update failed:', error);
    });

    this.logSync(`Cache refresh scheduled to run every ${FOUR_HOURS / 1000 / 60 / 60} hours`);
  }

  stopCaching() {
    if (this.cacheInterval) {
      clearInterval(this.cacheInterval);
      this.cacheInterval = null;
    }
  }
}