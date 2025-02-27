import { lumaApiRequest } from '../routes';
import { storage } from '../storage';
import { db } from '../db';
import { sql } from 'drizzle-orm';

export class CacheService {
  private static instance: CacheService;
  private cacheInterval: NodeJS.Timeout | null = null;
  private isCaching = false;
  private readonly CHUNK_SIZE = 200;
  private readonly MAX_CONCURRENT_REQUESTS = 5;
  private readonly REQUEST_DELAY = 200;
  private readonly BATCH_SIZE = 100; // Size of batches for DB operations

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

    // Use a single transaction for the entire batch
    await db.transaction(async (tx) => {
      const values = events.map(entry => {
        const eventData = entry.event;
        return {
          api_id: eventData.api_id,
          title: eventData.name,
          description: eventData.description || null,
          startTime: eventData.start_at,
          endTime: eventData.end_at,
          coverUrl: eventData.cover_url || null,
          url: eventData.url || null,
          timezone: eventData.timezone || null,
          location: eventData.geo_address_json ? JSON.stringify({
            city: eventData.geo_address_json.city,
            region: eventData.geo_address_json.region,
            country: eventData.geo_address_json.country,
            latitude: eventData.geo_latitude,
            longitude: eventData.geo_longitude,
            full_address: eventData.geo_address_json.full_address,
          }) : null,
          visibility: eventData.visibility || null,
          meetingUrl: eventData.meeting_url || eventData.zoom_meeting_url || null,
          calendarApiId: eventData.calendar_api_id || null,
          createdAt: eventData.created_at || null,
        };
      });

      // Create the bulk insert query
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
    console.log(`Batch insert completed in ${duration}ms`);
  }

  private async batchInsertPeople(people: any[]): Promise<void> {
    if (people.length === 0) return;

    const batchStartTime = Date.now();
    console.log(`Starting batch insert of ${people.length} people...`);

    // Use a single transaction for the entire batch
    await db.transaction(async (tx) => {
      const values = people.map(person => ({
        api_id: person.api_id,
        email: person.email,
        userName: person.userName || person.user?.name || null,
        fullName: person.fullName || person.user?.full_name || null,
        avatarUrl: person.avatarUrl || person.user?.avatar_url || null,
        role: person.role || null,
        phoneNumber: person.phoneNumber || person.user?.phone_number || null,
        bio: person.bio || person.user?.bio || null,
        organizationName: person.organizationName || person.user?.organization_name || null,
        jobTitle: person.jobTitle || person.user?.job_title || null,
        createdAt: person.created_at || null,
      }));

      // Create the bulk insert query
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
    console.log(`Batch insert completed in ${duration}ms`);
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
      const now = new Date();

      console.log(`Last cache update was ${lastUpdate ? lastUpdate.toISOString() : 'never'}`);
      const lastUpdateTime = lastUpdate || undefined;

      // Fetch data in parallel
      console.log('Fetching events and people in parallel...');

      const [events, people] = await Promise.all([
        this.fetchAllEvents(lastUpdateTime),
        this.fetchAllPeople(lastUpdateTime)
      ]);

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
    } finally {
      this.isCaching = false;
    }
  }

  private async fetchPeopleChunk(params: Record<string, string>): Promise<any[]> {
    try {
      const response = await lumaApiRequest('calendar/list-people', params);
      if (!response || !Array.isArray(response.entries)) {
        console.error('Invalid response format for people chunk:', response);
        return [];
      }
      return response.entries;
    } catch (error) {
      console.error('Error fetching people chunk:', error);
      return [];
    }
  }

  private async fetchEventChunk(params: Record<string, string>): Promise<any[]> {
    try {
      console.log('Fetching events chunk with params:', params);
      const response = await lumaApiRequest('calendar/list-events', params);

      if (!response || !Array.isArray(response.entries)) {
        console.error('Invalid response format for events chunk:', response);
        return [];
      }

      // Log the first event structure to help debug
      if (response.entries.length > 0) {
        console.log('Sample event structure:', JSON.stringify(response.entries[0], null, 2));
      }

      return response.entries;
    } catch (error) {
      console.error('Error fetching events chunk:', error);
      return [];
    }
  }

  private async fetchWithConcurrency<T>(
    chunks: Record<string, string>[],
    fetchFn: (params: Record<string, string>) => Promise<T[]>
  ): Promise<T[]> {
    const results: T[] = [];
    const startTime = Date.now();
    let totalProcessed = 0;

    for (let i = 0; i < chunks.length; i += this.MAX_CONCURRENT_REQUESTS) {
      const batchStartTime = Date.now();
      const chunkPromises = chunks
        .slice(i, i + this.MAX_CONCURRENT_REQUESTS)
        .map(async (params, index) => {
          // Stagger requests slightly to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, index * this.REQUEST_DELAY));
          return fetchFn(params);
        });

      const chunkResults = await Promise.all(chunkPromises);
      const flatResults = chunkResults.flat();
      results.push(...flatResults);

      totalProcessed += flatResults.length;
      const batchDuration = Date.now() - batchStartTime;
      const totalDuration = Date.now() - startTime;
      const recordsPerSecond = Math.round((totalProcessed / totalDuration) * 1000);

      console.log(`Batch completed: ${flatResults.length} records in ${batchDuration}ms (Total: ${totalProcessed} records at ${recordsPerSecond}/sec)`);
    }

    return results;
  }


  private async checkInitialDataLoadStatus(): Promise<boolean> {
    try {
      const [eventCount, peopleCount] = await Promise.all([
        storage.getEventCount(),
        storage.getPeopleCount()
      ]);

      return eventCount > 0 || peopleCount > 0;
    } catch (error) {
      console.error('Error checking data status:', error);
      return false;
    }
  }

  private async fetchAllPeople(lastUpdateTime?: Date): Promise<any[]> {
    console.log('Starting parallel fetch of people from Luma API...');

    const baseParams = {
      pagination_limit: String(this.CHUNK_SIZE),
      ...(lastUpdateTime && { created_after: lastUpdateTime.toISOString() })
    };

    let allPeople: any[] = [];
    let hasMore = true;
    let nextCursor: string | null = null;

    while (hasMore) {
      const chunks = Array(this.MAX_CONCURRENT_REQUESTS).fill(null).map(() => ({
        ...baseParams,
        ...(nextCursor && { pagination_cursor: nextCursor })
      }));

      const newPeople = await this.fetchWithConcurrency(chunks, this.fetchPeopleChunk);

      if (newPeople.length === 0) {
        break;
      }

      allPeople = allPeople.concat(newPeople);
      console.log(`Fetched ${newPeople.length} people in parallel. Total: ${allPeople.length}`);

      // Update cursor for next batch
      const lastBatchResponse = await lumaApiRequest('calendar/list-people', {
        ...baseParams,
        pagination_cursor: nextCursor || ''
      });

      hasMore = lastBatchResponse.has_more === true;
      nextCursor = lastBatchResponse.next_cursor;

      if (!hasMore || !nextCursor) {
        console.log('No more people to fetch');
        break;
      }
    }

    return allPeople;
  }

  private async fetchAllEvents(lastUpdateTime?: Date): Promise<any[]> {
    console.log('Starting parallel fetch of events from Luma API...');

    const baseParams = {
      pagination_limit: String(this.CHUNK_SIZE),
      ...(lastUpdateTime && { created_after: lastUpdateTime.toISOString() })
    };

    let allEvents: any[] = [];
    let hasMore = true;
    let nextCursor: string | null = null;
    const seenEventIds = new Set<string>();

    while (hasMore) {
      // Generate parallel request parameters
      const chunks = Array(this.MAX_CONCURRENT_REQUESTS).fill(null).map(() => ({
        ...baseParams,
        ...(nextCursor && { pagination_cursor: nextCursor })
      }));

      console.log(`Making ${chunks.length} parallel events requests`);
      const newEvents = await this.fetchWithConcurrency(chunks, this.fetchEventChunk);

      if (newEvents.length === 0) {
        console.log('No events returned in this batch, stopping pagination');
        break;
      }

      // Process and deduplicate events
      const uniqueNewEvents = newEvents.filter((entry: any) => {
        if (!entry || !entry.event || !entry.event.api_id) {
          console.warn('Invalid event entry structure:', entry);
          return false;
        }

        const eventData = entry.event;
        const isNew = !seenEventIds.has(eventData.api_id);
        if (isNew) {
          seenEventIds.add(eventData.api_id);
          // Log the first few events we're keeping
          if (allEvents.length < 3) {
            console.log('Adding unique event:', {
              api_id: eventData.api_id,
              name: eventData.name,
              start_at: eventData.start_at
            });
          }
        }
        return isNew;
      });

      allEvents = allEvents.concat(uniqueNewEvents);
      console.log(`Added ${uniqueNewEvents.length} unique events (Total: ${allEvents.length})`);

      // Get next page cursor
      try {
        const lastBatchResponse = await lumaApiRequest('calendar/list-events', {
          ...baseParams,
          pagination_cursor: nextCursor || ''
        });

        hasMore = lastBatchResponse.has_more === true;
        nextCursor = lastBatchResponse.next_cursor;

        console.log('Pagination status:', {
          hasMore,
          nextCursor,
          currentTotal: allEvents.length
        });

        if (!hasMore || !nextCursor) {
          console.log('No more events to fetch');
          break;
        }
      } catch (error) {
        console.error('Error getting next page cursor:', error);
        break;
      }
    }

    console.log(`Completed events fetch. Total unique events: ${allEvents.length}`);
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