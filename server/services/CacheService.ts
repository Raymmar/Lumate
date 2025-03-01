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

  private constructor() {
    super(); // Initialize EventEmitter
    console.log('Starting CacheService...');
  }

  static getInstance() {
    if (!this.instance) {
      console.log('Creating new CacheService instance...');
      this.instance = new CacheService();
    }
    return this.instance;
  }

  private emitProgress(message: string, progress: number) {
    console.log('Emitting progress:', { message, progress });
    this.emit('fetchProgress', {
      message,
      progress: Math.min(Math.round(progress), 100)
    });
  }

  async updateCache() {
    if (this.isCaching) {
      console.log('Cache update already in progress, skipping...');
      return;
    }

    this.isCaching = true;
    const syncStartTime = Date.now();
    console.log('Starting cache update process...');
    this.emitProgress('Starting cache update process...', 0);

    try {
      const lastUpdate = await storage.getLastCacheUpdate();
      console.log(`Last cache update was ${lastUpdate ? lastUpdate.toISOString() : 'never'}`);

      // If we're doing a fresh sync after reset, fetch everything
      const now = new Date();
      const lastUpdateTime = lastUpdate || new Date(0); // Use epoch time for fresh sync

      // First fetch all data from Luma API
      this.emitProgress('Fetching events and people from Luma API...', 10);
      console.log('Fetching events and people from Luma API...');

      const [events, people] = await Promise.all([
        this.fetchAllEvents(lastUpdateTime),
        this.fetchAllPeople(lastUpdateTime)
      ]);

      console.log(`Successfully fetched ${events.length} events and ${people.length} people from API`);
      this.emitProgress(`Successfully fetched ${events.length} events and ${people.length} people from API`, 50);

      // Process events in batches
      if (events.length > 0) {
        console.log(`Processing ${events.length} events in batches...`);
        this.emitProgress(`Processing ${events.length} events...`, 60);

        for (let i = 0; i < events.length; i += this.BATCH_SIZE) {
          const batch = events.slice(i, i + this.BATCH_SIZE);
          await this.batchInsertEvents(batch);
          const progress = 60 + (i / events.length) * 20;
          this.emitProgress(
            `Processed events batch ${i / this.BATCH_SIZE + 1} of ${Math.ceil(events.length / this.BATCH_SIZE)}`,
            progress
          );
        }
      }

      // Process people in batches
      if (people.length > 0) {
        console.log(`Processing ${people.length} people in batches...`);
        this.emitProgress(`Processing ${people.length} people...`, 80);

        for (let i = 0; i < people.length; i += this.BATCH_SIZE) {
          const batch = people.slice(i, i + this.BATCH_SIZE);
          await this.batchInsertPeople(batch);
          const progress = 80 + (i / people.length) * 15;
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

      if (eventCount === 0 && peopleCount === 0) {
        throw new Error(`Sync verification failed: Expected non-zero counts, got events=${eventCount}, people=${peopleCount}`);
      }

      // Update the last cache time
      await storage.setLastCacheUpdate(now);

      const totalDuration = (Date.now() - syncStartTime) / 1000;
      const finalMessage = `Cache update completed in ${totalDuration}s. Processed ${events.length} events and ${people.length} people.`;
      console.log(finalMessage);
      this.emitProgress(finalMessage, 100);

    } catch (error) {
      console.error('Cache update process failed:', error);
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

  private async fetchWithRetry(endpoint: string, params: Record<string, string>): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await lumaApiRequest(endpoint, params);
      } catch (error) {
        console.error(`Attempt ${attempt} failed for ${endpoint}:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.MAX_RETRIES) {
          const delay = this.RETRY_DELAY * attempt;
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error(`Failed to fetch ${endpoint} after ${this.MAX_RETRIES} attempts`);
  }

  private async fetchAllEvents(lastUpdateTime: Date): Promise<any[]> {
    console.log('Starting fetch of events from Luma API...');
    console.log('Using created_after:', lastUpdateTime.toISOString());

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
        console.log(`Fetching events page ${pageCount} with params:`, params);
        const response = await this.fetchWithRetry('calendar/list-events', params);

        if (!response || !Array.isArray(response.entries)) {
          console.error('Invalid response format:', response);
          throw new Error('Invalid API response format');
        }

        const events = response.entries;
        console.log(`Received ${events.length} events in page ${pageCount}`);

        // Process events
        const uniqueEvents = events.filter((entry: any) => {
          if (!entry || !entry.event || !entry.event.api_id) {
            console.warn('Invalid event entry structure:', entry);
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
        console.log(`Added ${uniqueEvents.length} unique events (Total: ${allEvents.length}, Page: ${pageCount})`);

        hasMore = response.has_more === true;
        nextCursor = response.next_cursor;

        if (!hasMore || !nextCursor) {
          console.log(`No more events to fetch after ${pageCount} pages`);
          break;
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error fetching events page ${pageCount}:`, error);
        throw error;
      }
    }

    console.log(`Completed events fetch. Total unique events: ${allEvents.length} from ${pageCount} pages`);
    return allEvents;
  }

  private async fetchAllPeople(lastUpdateTime: Date): Promise<any[]> {
    console.log('Starting fetch of people from Luma API...');
    console.log('Using created_after:', lastUpdateTime.toISOString());

    const allPeople: any[] = [];
    const seenPeopleIds = new Set<string>();
    let hasMore = true;
    let nextCursor: string | null = null;
    let pageCount = 0;

    while (hasMore || nextCursor) {
      const params: Record<string, string> = {
        pagination_limit: String(this.BATCH_SIZE),
        created_after: lastUpdateTime.toISOString()
      };

      if (nextCursor) {
        params.pagination_cursor = nextCursor;
      }

      try {
        pageCount++;
        console.log(`Fetching people page ${pageCount} with params:`, params);
        const response = await this.fetchWithRetry('calendar/list-people', params);

        if (!response || !Array.isArray(response.entries)) {
          console.error('Invalid response format:', response);
          throw new Error('Invalid API response format');
        }

        const people = response.entries;
        console.log(`Received ${people.length} people in page ${pageCount}`);

        // Process people
        const uniquePeople = people.filter((person: any) => {
          if (!person || !person.api_id) {
            console.warn('Invalid person entry structure:', person);
            return false;
          }

          const isNew = !seenPeopleIds.has(person.api_id);
          if (isNew) {
            seenPeopleIds.add(person.api_id);
          }
          return isNew;
        });

        allPeople.push(...uniquePeople);
        console.log(`Added ${uniquePeople.length} unique people (Total: ${allPeople.length}, Page: ${pageCount})`);

        hasMore = response.has_more === true;
        nextCursor = response.next_cursor;

        if (!hasMore && !nextCursor) {
          console.log(`No more people to fetch after ${pageCount} pages`);
          break;
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error fetching people page ${pageCount}:`, error);
        throw error;
      }
    }

    console.log(`Completed people fetch. Total unique people: ${allPeople.length} from ${pageCount} pages`);
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
      console.error('Failed to batch insert events:', error);
      throw error;
    }
  }

  private async batchInsertPeople(people: any[]): Promise<void> {
    if (people.length === 0) return;

    try {
      await db.transaction(async (tx) => {
        // Get existing users to maintain email relationships
        const existingUsers = await db.select().from(users);
        console.log(`Found ${existingUsers.length} existing users to maintain relationships with`);

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
              console.log(`Relinking user ${matchingUser.email} with person ${person.email}`);
              await tx.execute(sql`
                UPDATE users 
                SET person_id = ${insertedPerson.id} 
                WHERE id = ${matchingUser.id}
              `);
            }
          } catch (error) {
            console.error(`Failed to process person ${person.api_id}:`, error);
            throw error;
          }
        }
      });

      console.log(`Successfully processed ${people.length} people`);
    } catch (error) {
      console.error('Failed to batch insert people:', error);
      throw error;
    }
  }

  startCaching() {
    const FOUR_HOURS = 4 * 60 * 60 * 1000;
    this.cacheInterval = setInterval(() => {
      console.log('Running scheduled cache update...');
      this.updateCache().catch(error => {
        console.error('Scheduled cache update failed:', error);
      });
    }, FOUR_HOURS);

    console.log('Running initial cache update...');
    this.updateCache().catch(error => {
      console.error('Initial cache update failed:', error);
    });

    console.log(`Cache refresh scheduled to run every ${FOUR_HOURS / 1000 / 60 / 60} hours`);
  }

  stopCaching() {
    if (this.cacheInterval) {
      clearInterval(this.cacheInterval);
      this.cacheInterval = null;
    }
  }
}