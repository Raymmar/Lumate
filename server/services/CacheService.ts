import { lumaApiRequest } from '../routes';
import { storage } from '../storage';
import { db } from '../db';
import { sql } from 'drizzle-orm';

export class CacheService {
  private static instance: CacheService;
  private cacheInterval: NodeJS.Timeout | null = null;
  private isCaching = false;
  private readonly BATCH_SIZE = 50;  // Match Luma API's pagination limit

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

  private async batchInsertEvents(events: any[]): Promise<void> {
    if (events.length === 0) return;

    const batchStartTime = Date.now();
    console.log(`Starting batch insert of ${events.length} events...`);

    try {
      // Execute bulk upsert
      await db.transaction(async (tx) => {
        const values = events.map(entry => {
          const eventData = entry.event;
          return {
            api_id: eventData.api_id,
            title: eventData.name,
            description: eventData.description || null,
            start_time: eventData.start_at,
            end_time: eventData.end_at,
            cover_url: eventData.cover_url || null,
            url: eventData.url || null,
            timezone: eventData.timezone || null,
            location: eventData.geo_address_json ? {
              city: eventData.geo_address_json.city,
              region: eventData.geo_address_json.region,
              country: eventData.geo_address_json.country,
              latitude: eventData.geo_latitude,
              longitude: eventData.geo_longitude,
              full_address: eventData.geo_address_json.full_address,
            } : null,
            visibility: eventData.visibility || null,
            meeting_url: eventData.meeting_url || eventData.zoom_meeting_url || null,
            calendar_api_id: eventData.calendar_api_id || null,
            created_at: eventData.created_at || null,
          };
        });

        // Use json_populate_recordset for efficient bulk insert
        const query = sql`
          INSERT INTO events (
            api_id, title, description, start_time, end_time,
            cover_url, url, timezone, location, visibility,
            meeting_url, calendar_api_id, created_at
          )
          SELECT * FROM json_populate_recordset(null::events, ${JSON.stringify(values)})
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
        const values = people.map(person => ({
          api_id: person.api_id,
          email: person.email,
          user_name: person.userName || person.user?.name || null,
          full_name: person.fullName || person.user?.full_name || null,
          avatar_url: person.avatarUrl || person.user?.avatar_url || null,
          role: person.role || null,
          phone_number: person.phoneNumber || person.user?.phone_number || null,
          bio: person.bio || person.user?.bio || null,
          organization_name: person.organizationName || person.user?.organization_name || null,
          job_title: person.jobTitle || person.user?.job_title || null,
          created_at: person.created_at || null,
        }));

        const query = sql`
          INSERT INTO people (
            api_id, email, user_name, full_name, avatar_url,
            role, phone_number, bio, organization_name, job_title, created_at
          )
          SELECT * FROM json_populate_recordset(null::people, ${JSON.stringify(values)})
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
        `;

        await tx.execute(query);
      });

      const duration = Date.now() - batchStartTime;
      const recordsPerSecond = Math.round((people.length / duration) * 1000);
      console.log(`People batch insert completed in ${duration}ms (${recordsPerSecond} records/sec)`);
    } catch (error) {
      console.error('Failed to batch insert people:', error);
      throw error;
    }
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

      // Fetch data in parallel
      console.log('Fetching events and people in parallel...');

      const [events, people] = await Promise.all([
        this.fetchAllEvents(lastUpdateTime),
        this.fetchAllPeople(lastUpdateTime)
      ]);

      console.log(`Fetched ${events.length} events and ${people.length} people from API`);

      let hasNewData = false;

      // Process events in batches
      if (events.length > 0) {
        console.log(`Processing ${events.length} events in batches...`);
        for (let i = 0; i < events.length; i += this.BATCH_SIZE) {
          const batch = events.slice(i, i + this.BATCH_SIZE);
          await this.batchInsertEvents(batch);
          hasNewData = true;
        }
      }

      // Process people in batches
      if (people.length > 0) {
        console.log(`Processing ${people.length} people in batches...`);
        for (let i = 0; i < people.length; i += this.BATCH_SIZE) {
          const batch = people.slice(i, i + this.BATCH_SIZE);
          await this.batchInsertPeople(batch);
          hasNewData = true;
        }
      }

      if (hasNewData) {
        await storage.setLastCacheUpdate(now);
        const totalDuration = (Date.now() - syncStartTime) / 1000;
        console.log(`Cache update completed in ${totalDuration}s. Processed ${events.length} events and ${people.length} people.`);
      } else {
        console.log('No new data to sync');
      }
    } catch (error) {
      console.error('Cache update process failed:', error);
      throw error; // Propagate error to trigger retry
    } finally {
      this.isCaching = false;
    }
  }

  private async fetchAllPeople(lastUpdateTime: Date): Promise<any[]> {
    console.log('Starting fetch of people from Luma API...');

    const allPeople: any[] = [];
    const params: Record<string, string> = {
      pagination_limit: String(this.BATCH_SIZE),
      created_after: lastUpdateTime.toISOString()
    };

    let hasMore = true;
    let nextCursor: string | null = null;

    while (hasMore) {
      if (nextCursor) {
        params.pagination_cursor = nextCursor;
      }

      console.log('Fetching people with params:', params);
      const response = await lumaApiRequest('calendar/list-people', params);

      if (!response || !Array.isArray(response.entries)) {
        console.error('Invalid response format:', response);
        break;
      }

      const people = response.entries;
      allPeople.push(...people);

      console.log(`Fetched ${people.length} people (Total: ${allPeople.length})`);

      hasMore = response.has_more === true;
      nextCursor = response.next_cursor;

      if (!hasMore || !nextCursor) {
        console.log('No more people to fetch');
        break;
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return allPeople;
  }

  private async fetchAllEvents(lastUpdateTime: Date): Promise<any[]> {
    console.log('Starting fetch of events from Luma API...');

    const allEvents: any[] = [];
    const seenEventIds = new Set<string>();
    const params: Record<string, string> = {
      pagination_limit: String(this.BATCH_SIZE),
      created_after: lastUpdateTime.toISOString()
    };

    let hasMore = true;
    let nextCursor: string | null = null;

    while (hasMore) {
      if (nextCursor) {
        params.pagination_cursor = nextCursor;
      }

      console.log('Fetching events with params:', params);
      const response = await lumaApiRequest('calendar/list-events', params);

      if (!response || !Array.isArray(response.entries)) {
        console.error('Invalid response format:', response);
        break;
      }

      const events = response.entries;

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
      console.log(`Fetched ${uniqueEvents.length} unique events (Total: ${allEvents.length})`);

      hasMore = response.has_more === true;
      nextCursor = response.next_cursor;

      if (!hasMore || !nextCursor) {
        console.log('No more events to fetch');
        break;
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return allEvents;
  }

  startCaching() {
    // Set up a periodic sync interval (4 hours)
    const FOUR_HOURS = 4 * 60 * 60 * 1000;
    this.cacheInterval = setInterval(() => {
      console.log('Running scheduled cache update...');
      this.updateCache();
    }, FOUR_HOURS);

    console.log(`Cache refresh scheduled to run every ${FOUR_HOURS / 1000 / 60 / 60} hours`);
  }

  stopCaching() {
    if (this.cacheInterval) {
      clearInterval(this.cacheInterval);
      this.cacheInterval = null;
    }
  }
}