import { lumaApiRequest } from '../routes';
import { storage } from '../storage';

export class CacheService {
  private static instance: CacheService;
  private cacheInterval: NodeJS.Timeout | null = null;
  private isCaching = false;
  private readonly CHUNK_SIZE = 200; // Increased from 100
  private readonly MAX_CONCURRENT_REQUESTS = 5; // Increased from 3
  private readonly REQUEST_DELAY = 200; // Reduced from 500ms

  private constructor() {
    console.log('Starting CacheService...');
    this.startCaching();
  }

  static getInstance() {
    if (!this.instance) {
      console.log('Creating new CacheService instance...');
      this.instance = new CacheService();

      // Check if we have data already
      this.instance.checkInitialDataLoadStatus()
        .then(hasData => {
          const delay = hasData ? 5000 : 100; // Shorter delay for empty DB
          console.log(hasData
            ? 'Database has existing data, scheduling background sync in 5s'
            : 'Database is empty, starting initial sync shortly');

          setTimeout(() => {
            this.instance.updateCache();
          }, delay);
        })
        .catch(error => {
          console.error('Failed to check data status:', error);
          setTimeout(() => {
            this.instance.updateCache();
          }, 5000);
        });
    }
    return this.instance;
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

  private async processDataInBatches<T>(
    items: T[],
    processFn: (item: T) => Promise<void>,
    batchSize: number = 50
  ): Promise<void> {
    const startTime = Date.now();
    let processed = 0;

    for (let i = 0; i < items.length; i += batchSize) {
      const batchStartTime = Date.now();
      const batch = items.slice(i, i + batchSize);

      await Promise.all(batch.map(async (item) => {
        try {
          await processFn(item);
          processed++;
        } catch (error) {
          console.error('Failed to process item:', error);
        }
      }));

      const batchDuration = Date.now() - batchStartTime;
      const totalDuration = Date.now() - startTime;
      const itemsPerSecond = Math.round((processed / totalDuration) * 1000);

      console.log(`Processed batch of ${batch.length} items in ${batchDuration}ms (Total: ${processed}/${items.length} at ${itemsPerSecond}/sec)`);
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
      const [eventsResult, peopleResult] = await Promise.allSettled([
        this.fetchAllEvents(lastUpdateTime),
        this.fetchAllPeople(lastUpdateTime)
      ]);

      let hasNewData = false;
      let processedEvents = 0;
      let processedPeople = 0;

      // Process events with batched database operations
      if (eventsResult.status === 'fulfilled' && eventsResult.value.length > 0) {
        const events = eventsResult.value;
        console.log(`Processing ${events.length} events in batches...`);

        await this.processDataInBatches(events, async (entry) => {
          const eventData = entry.event;
          if (!eventData?.name || !eventData?.start_at || !eventData?.end_at) {
            return;
          }

          await storage.insertEvent({
            api_id: eventData.api_id,
            title: eventData.name,
            description: eventData.description || null,
            startTime: eventData.start_at,
            endTime: eventData.end_at,
            coverUrl: eventData.cover_url || null,
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
            meetingUrl: eventData.meeting_url || eventData.zoom_meeting_url || null,
            calendarApiId: eventData.calendar_api_id || null,
            createdAt: eventData.created_at || null,
          });
          processedEvents++;
          hasNewData = true;
        });

        console.log(`Successfully processed ${processedEvents} events`);
      }

      // Process people with batched database operations
      if (peopleResult.status === 'fulfilled' && peopleResult.value.length > 0) {
        const people = peopleResult.value;
        console.log(`Processing ${people.length} people in batches...`);

        await this.processDataInBatches(people, async (person) => {
          if (!person.api_id || !person.email) {
            return;
          }

          await storage.insertPerson({
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
          });
          processedPeople++;
          hasNewData = true;
        });

        console.log(`Successfully processed ${processedPeople} people`);
      }

      if (hasNewData) {
        await storage.setLastCacheUpdate(now);
        const totalDuration = (Date.now() - syncStartTime) / 1000;
        const totalRecords = processedEvents + processedPeople;
        const recordsPerSecond = Math.round(totalRecords / totalDuration);

        console.log(`Cache update completed in ${totalDuration}s. Processed ${totalRecords} records (${recordsPerSecond} records/sec)`);
      } else {
        console.log('No new data to sync');
      }
    } catch (error) {
      console.error('Cache update process failed:', error);
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

    console.log(`Cache refresh scheduled to run every ${FOUR_HOURS / 1000 / 60 / 60} hours`);
  }

  stopCaching() {
    if (this.cacheInterval) {
      clearInterval(this.cacheInterval);
      this.cacheInterval = null;
    }
  }
}