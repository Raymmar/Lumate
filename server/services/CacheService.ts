import { lumaApiRequest } from '../routes';
import { storage } from '../storage';
import { db } from '../db';
import { sql } from 'drizzle-orm';

export class CacheService {
  private static instance: CacheService;
  private cacheInterval: NodeJS.Timeout | null = null;
  private isCaching = false;
  private readonly BATCH_SIZE = 50;  // Luma API's pagination limit

  private constructor() {
    console.log('Starting CacheService...');
    this.startCaching();
  }

  static getInstance() {
    if (!this.instance) {
      console.log('Creating new CacheService instance...');
      this.instance = new CacheService();
    }
    return this.instance;
  }

  async updateCache() {
    if (this.isCaching) {
      console.log('Cache update already in progress, skipping...');
      return;
    }

    this.isCaching = true;
    const syncStartTime = Date.now();
    console.log('Starting cache update process...');

    try {
      const lastUpdate = await storage.getLastCacheUpdate();
      console.log(`Last cache update was ${lastUpdate ? lastUpdate.toISOString() : 'never'}`);

      // If we're doing a fresh sync after reset, fetch everything
      const now = new Date();
      const lastUpdateTime = lastUpdate || new Date(0); // Use epoch time for fresh sync

      // First fetch all data from Luma API
      console.log('Fetching events and people from Luma API...');
      const [events, people] = await Promise.all([
        this.fetchAllEvents(lastUpdateTime),
        this.fetchAllPeople(lastUpdateTime)
      ]);

      console.log(`Successfully fetched ${events.length} events and ${people.length} people from API`);

      // Process events in batches
      if (events.length > 0) {
        console.log(`Processing ${events.length} events in batches...`);
        for (let i = 0; i < events.length; i += this.BATCH_SIZE) {
          const batch = events.slice(i, i + this.BATCH_SIZE);
          await this.batchInsertEvents(batch);
          console.log(`Processed events batch ${i / this.BATCH_SIZE + 1} of ${Math.ceil(events.length / this.BATCH_SIZE)}`);
        }
      }

      // Process people in batches while preserving email relationships
      if (people.length > 0) {
        console.log(`Processing ${people.length} people in batches...`);
        for (let i = 0; i < people.length; i += this.BATCH_SIZE) {
          const batch = people.slice(i, i + this.BATCH_SIZE);
          await this.batchInsertPeople(batch);
          console.log(`Processed people batch ${i / this.BATCH_SIZE + 1} of ${Math.ceil(people.length / this.BATCH_SIZE)}`);
        }
      }

      // Update the last cache time
      await storage.setLastCacheUpdate(now);

      const totalDuration = (Date.now() - syncStartTime) / 1000;
      console.log(`Cache update completed in ${totalDuration}s. Processed ${events.length} events and ${people.length} people.`);
    } catch (error) {
      console.error('Cache update process failed:', error);
      throw error;
    } finally {
      this.isCaching = false;
    }
  }

  startCaching() {
    // Set up a periodic sync interval (4 hours)
    const FOUR_HOURS = 4 * 60 * 60 * 1000;
    this.cacheInterval = setInterval(() => {
      console.log('Running scheduled cache update...');
      this.updateCache();
    }, FOUR_HOURS);

    // Also run an immediate update when starting
    console.log('Running initial cache update...');
    this.updateCache();

    console.log(`Cache refresh scheduled to run every ${FOUR_HOURS / 1000 / 60 / 60} hours`);
  }

  stopCaching() {
    if (this.cacheInterval) {
      clearInterval(this.cacheInterval);
      this.cacheInterval = null;
    }
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
        const response = await lumaApiRequest('calendar/list-events', params);

        if (!response || !Array.isArray(response.entries)) {
          console.error('Invalid response format:', response);
          break;
        }

        const events = response.entries;
        console.log(`Received ${events.length} events in page ${pageCount}`);

        // Deduplicate events
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

        // Small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error fetching events page ${pageCount}:`, error);
        break;
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
        console.log(`Fetching people page ${pageCount} with params:`, params);
        const response = await lumaApiRequest('calendar/list-people', params);

        if (!response || !Array.isArray(response.entries)) {
          console.error('Invalid response format:', response);
          break;
        }

        const people = response.entries;
        console.log(`Received ${people.length} people in page ${pageCount}`);

        // Deduplicate people while preserving the most recent data
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

        if (!hasMore || !nextCursor) {
          console.log(`No more people to fetch after ${pageCount} pages`);
          break;
        }

        // Small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error fetching people page ${pageCount}:`, error);
        break;
      }
    }

    console.log(`Completed people fetch. Total unique people: ${allPeople.length} from ${pageCount} pages`);
    return allPeople;
  }

  private async batchInsertEvents(events: any[]): Promise<void> {
    if (events.length === 0) return;

    const batchStartTime = Date.now();
    console.log(`Starting batch insert of ${events.length} events...`);

    try {
      await db.transaction(async (tx) => {
        // Map the event data to match our schema
        const values = events.map(entry => {
          const eventData = entry.event;
          const location = eventData.geo_address_json ? {
            city: eventData.geo_address_json.city,
            region: eventData.geo_address_json.region,
            country: eventData.geo_address_json.country,
            latitude: eventData.geo_latitude,
            longitude: eventData.geo_longitude,
            full_address: eventData.geo_address_json.full_address,
          } : null;

          return {
            api_id: eventData.api_id,
            title: eventData.name,
            description: eventData.description || null,
            start_time: eventData.start_at,
            end_time: eventData.end_at,
            cover_url: eventData.cover_url || null,
            url: eventData.url || null,
            timezone: eventData.timezone || null,
            location: location ? JSON.stringify(location) : null,
            visibility: eventData.visibility || null,
            meeting_url: eventData.meeting_url || eventData.zoom_meeting_url || null,
            calendar_api_id: eventData.calendar_api_id || null,
            created_at: eventData.created_at || null,
          };
        });

        // Create the SQL query with exact column names from our schema
        for (const event of values) {
          const query = sql`
            INSERT INTO events (
              api_id, title, description, start_time, end_time,
              cover_url, url, timezone, location, visibility,
              meeting_url, calendar_api_id, created_at
            ) 
            VALUES (
              ${event.api_id}, 
              ${event.title}, 
              ${event.description}, 
              ${event.start_time}, 
              ${event.end_time},
              ${event.cover_url}, 
              ${event.url}, 
              ${event.timezone}, 
              ${event.location}::jsonb, 
              ${event.visibility}, 
              ${event.meeting_url}, 
              ${event.calendar_api_id}, 
              ${event.created_at}
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
            RETURNING *
          `;

          await tx.execute(query);
        }
      });

      const duration = Date.now() - batchStartTime;
      const recordsPerSecond = Math.round((events.length / duration) * 1000);
      console.log(`Events batch insert completed in ${duration}ms (${recordsPerSecond} records/sec)`);
    } catch (error) {
      console.error('Failed to batch insert events:', error);
      throw error;
    }
  }

  private async batchInsertPeople(people: any[]): Promise<void> {
    if (people.length === 0) return;

    const batchStartTime = Date.now();
    console.log(`Starting batch insert of ${people.length} people...`);

    try {
      await db.transaction(async (tx) => {
        for (const person of people) {
          // First get the existing person record to preserve any existing relationships
          const existingPerson = await storage.getPersonByApiId(person.api_id);

          // Construct the new person data, maintaining the email if it exists
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

          await tx.execute(query);
        }
      });

      const duration = Date.now() - batchStartTime;
      const recordsPerSecond = Math.round((people.length / duration) * 1000);
      console.log(`People batch insert completed in ${duration}ms (${recordsPerSecond} records/sec)`);
    } catch (error) {
      console.error('Failed to batch insert people:', error);
      throw error;
    }
  }
}