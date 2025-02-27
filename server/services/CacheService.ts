import { lumaApiRequest } from '../routes';
import { storage } from '../storage';

export class CacheService {
  private static instance: CacheService;
  private cacheInterval: NodeJS.Timeout | null = null;
  private isCaching = false;
  private readonly CHUNK_SIZE = 100;
  private readonly MAX_CONCURRENT_REQUESTS = 3;
  private readonly REQUEST_DELAY = 500; // ms between parallel requests

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
      const response = await lumaApiRequest('calendar/list-events', params);
      if (!response || !Array.isArray(response.entries)) {
        console.error('Invalid response format for events chunk:', response);
        return [];
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

    for (let i = 0; i < chunks.length; i += this.MAX_CONCURRENT_REQUESTS) {
      const chunkPromises = chunks
        .slice(i, i + this.MAX_CONCURRENT_REQUESTS)
        .map(async (params) => {
          await new Promise(resolve => setTimeout(resolve, this.REQUEST_DELAY));
          return fetchFn(params);
        });

      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults.flat());
    }

    return results;
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
      const chunks = Array(this.MAX_CONCURRENT_REQUESTS).fill(null).map(() => ({
        ...baseParams,
        ...(nextCursor && { pagination_cursor: nextCursor })
      }));

      const newEvents = await this.fetchWithConcurrency(chunks, this.fetchEventChunk);

      if (newEvents.length === 0) {
        break;
      }

      // Deduplicate events
      const uniqueNewEvents = newEvents.filter((entry: any) => {
        const eventData = entry.event;
        if (!eventData?.api_id) {
          console.warn('Invalid event data:', eventData);
          return false;
        }
        const isNew = !seenEventIds.has(eventData.api_id);
        if (isNew) seenEventIds.add(eventData.api_id);
        return isNew;
      });

      allEvents = allEvents.concat(uniqueNewEvents);
      console.log(`Fetched ${uniqueNewEvents.length} unique events in parallel. Total: ${allEvents.length}`);

      // Update cursor for next batch
      const lastBatchResponse = await lumaApiRequest('calendar/list-events', {
        ...baseParams,
        pagination_cursor: nextCursor || ''
      });

      hasMore = lastBatchResponse.has_more === true;
      nextCursor = lastBatchResponse.next_cursor;

      if (!hasMore || !nextCursor) {
        console.log('No more events to fetch');
        break;
      }
    }

    return allEvents;
  }

  async updateCache() {
    if (this.isCaching) {
      console.log('Cache update already in progress, skipping...');
      return;
    }

    this.isCaching = true;
    console.log('Starting cache update process...');

    try {
      // Get the last update timestamp
      const lastUpdate = await storage.getLastCacheUpdate();
      const now = new Date();

      console.log(`Last cache update was ${lastUpdate ? lastUpdate.toISOString() : 'never'}`);

      // Use the last update time if available, otherwise fetch all data
      const lastUpdateTime = lastUpdate || undefined;

      // Fetch new data from APIs in parallel
      console.log('Fetching new events and people in parallel...');

      const [eventsResult, peopleResult] = await Promise.allSettled([
        this.fetchAllEvents(lastUpdateTime),
        this.fetchAllPeople(lastUpdateTime)
      ]);

      let hasNewData = false;
      let processedEvents = 0;
      let processedPeople = 0;

      // Process new events
      if (eventsResult.status === 'fulfilled' && eventsResult.value.length > 0) {
        const events = eventsResult.value;
        console.log(`Processing ${events.length} new events...`);

        await Promise.all(events.map(async (entry) => {
          try {
            const eventData = entry.event;
            if (!eventData?.name || !eventData?.start_at || !eventData?.end_at) {
              console.warn('Skipping event - Missing required fields:', eventData);
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
          } catch (error) {
            console.error('Failed to process event:', error);
          }
        }));
        console.log(`Successfully processed ${processedEvents} events`);
      } else {
        console.log('No new events to sync');
      }

      // Process new people
      if (peopleResult.status === 'fulfilled' && peopleResult.value.length > 0) {
        const people = peopleResult.value;
        console.log(`Processing ${people.length} new people...`);

        await Promise.all(people.map(async (person) => {
          try {
            if (!person.api_id || !person.email) {
              console.warn('Skipping person - Missing required fields:', person);
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
          } catch (error) {
            console.error('Failed to process person:', error);
          }
        }));
        console.log(`Successfully processed ${processedPeople} people`);
      } else {
        console.log('No new people to sync');
      }

      // Only update the last cache time if we actually processed new data
      if (hasNewData) {
        await storage.setLastCacheUpdate(now);
        console.log(`Cache update completed with new data at ${now.toISOString()}. Processed ${processedEvents} events and ${processedPeople} people.`);
      } else {
        console.log('No new data processed, keeping existing last update timestamp');
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