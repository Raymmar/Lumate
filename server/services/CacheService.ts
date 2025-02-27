import { lumaApiRequest } from '../routes';
import { storage } from '../storage';

export class CacheService {
  private static instance: CacheService;
  private cacheInterval: NodeJS.Timeout | null = null;
  private isCaching = false;

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
          // Still start caching on error, just with a delay
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

  private async fetchAllPeople(lastUpdateTime?: Date): Promise<any[]> {
    let allPeople: any[] = [];
    let nextCursor: string | null = null;
    let hasMore = true;
    let attempts = 0;
    let noProgressCount = 0;
    const MAX_ATTEMPTS = 1000; // Increased to handle large datasets
    const MAX_NO_PROGRESS_ATTEMPTS = 3;
    const PAGINATION_LIMIT = '100'; // Increased for faster syncing

    console.log('Starting to fetch people from Luma API...');

    while (hasMore && attempts < MAX_ATTEMPTS && noProgressCount < MAX_NO_PROGRESS_ATTEMPTS) {
      try {
        attempts++;
        const params: Record<string, string> = {
          pagination_limit: PAGINATION_LIMIT
        };

        if (nextCursor) {
          params.pagination_cursor = nextCursor;
        }

        if (lastUpdateTime) {
          params.created_after = lastUpdateTime.toISOString();
          console.log('Using created_after filter:', params.created_after);
        }

        console.log(`Making people request with params (Attempt ${attempts}):`, params);

        const response = await lumaApiRequest('calendar/list-people', params);

        if (!response || !Array.isArray(response.entries)) {
          console.error('Invalid response format:', response);
          noProgressCount++;
          continue;
        }

        const people = response.entries;

        if (!people.length) {
          console.log('No people in response, stopping pagination');
          break;
        }

        const previousCount = allPeople.length;
        allPeople = allPeople.concat(people);

        console.log(`Fetched ${people.length} people in this batch (Total: ${allPeople.length})`);

        if (allPeople.length === previousCount) {
          noProgressCount++;
          console.warn(`No new people received. Attempt ${noProgressCount} of ${MAX_NO_PROGRESS_ATTEMPTS}`);
        } else {
          noProgressCount = 0;
        }

        hasMore = response.has_more === true;
        nextCursor = response.next_cursor;

        if (!hasMore || !nextCursor) {
          console.log('No more results available');
          break;
        }

        // Shorter delay between successful requests
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error('Failed to fetch people batch:', error);
        noProgressCount++;

        if (noProgressCount >= MAX_NO_PROGRESS_ATTEMPTS) {
          console.log('Max retries reached, returning collected data');
          break;
        }

        // Longer delay after error
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`Completed fetching people. Total count: ${allPeople.length}`);
    return allPeople;
  }

  private async fetchAllEvents(lastUpdateTime?: Date): Promise<any[]> {
    let allEvents: any[] = [];
    let nextCursor: string | null = null;
    let hasMore = true;
    let attempts = 0;
    let noProgressCount = 0;
    const MAX_ATTEMPTS = 1000; // Increased to handle large datasets
    const MAX_NO_PROGRESS_ATTEMPTS = 3;
    const PAGINATION_LIMIT = '100'; // Increased for faster syncing
    const seenEventIds = new Set<string>();

    console.log('Starting to fetch events from Luma API...');

    while (hasMore && attempts < MAX_ATTEMPTS && noProgressCount < MAX_NO_PROGRESS_ATTEMPTS) {
      try {
        attempts++;
        const params: Record<string, string> = {
          pagination_limit: PAGINATION_LIMIT
        };

        if (nextCursor) {
          params.pagination_cursor = nextCursor;
        }

        if (lastUpdateTime) {
          params.created_after = lastUpdateTime.toISOString();
          console.log('Using created_after filter:', params.created_after);
        }

        console.log(`Making events request with params (Attempt ${attempts}):`, params);

        const response = await lumaApiRequest('calendar/list-events', params);

        if (!response || !Array.isArray(response.entries)) {
          console.error('Invalid events response format:', response);
          noProgressCount++;
          continue;
        }

        const events = response.entries;

        if (!events.length) {
          console.log('No events in response, stopping pagination');
          break;
        }

        const previousCount = allEvents.length;

        const uniqueNewEvents = events.filter((entry: any) => {
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

        console.log(`Fetched ${uniqueNewEvents.length} unique events in this batch (Total: ${allEvents.length})`);

        if (allEvents.length === previousCount) {
          noProgressCount++;
          console.warn(`No new events received. Attempt ${noProgressCount} of ${MAX_NO_PROGRESS_ATTEMPTS}`);
        } else {
          noProgressCount = 0;
        }

        hasMore = response.has_more === true;
        nextCursor = response.next_cursor;

        if (!hasMore || !nextCursor) {
          console.log('No more events results available');
          break;
        }

        // Shorter delay between successful requests
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error('Failed to fetch events batch:', error);
        noProgressCount++;

        if (noProgressCount >= MAX_NO_PROGRESS_ATTEMPTS) {
          console.log('Max retries reached, returning collected events');
          break;
        }

        // Longer delay after error
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`Completed fetching events. Total count: ${allEvents.length}`);
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

      // Fetch new data from APIs
      console.log('Fetching new events and people...');

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

        for (const entry of events) {
          try {
            const eventData = entry.event;
            if (!eventData?.name || !eventData?.start_at || !eventData?.end_at) {
              console.warn('Skipping event - Missing required fields:', eventData);
              continue;
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
        }
        console.log(`Successfully processed ${processedEvents} events`);
      } else {
        console.log('No new events to sync');
      }

      // Process new people
      if (peopleResult.status === 'fulfilled' && peopleResult.value.length > 0) {
        const people = peopleResult.value;
        console.log(`Processing ${people.length} new people...`);

        for (const person of people) {
          try {
            if (!person.api_id || !person.email) {
              console.warn('Skipping person - Missing required fields:', person);
              continue;
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
        }
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