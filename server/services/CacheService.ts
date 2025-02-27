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

      // Check if we have data already before triggering a sync
      this.instance.checkInitialDataLoadStatus()
        .then(hasData => {
          console.log(hasData 
            ? 'Database contains existing data, scheduling background sync'
            : 'Database is empty, performing initial sync');

          // Small delay before sync to prevent impacting application startup
          setTimeout(() => {
            this.instance.updateCache();
          }, 5000); // 5 second delay
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

  private async fetchAllPeople(lastUpdate?: Date): Promise<any[]> {
    let allPeople: any[] = [];
    let nextCursor: string | null = null;
    let hasMore = true;
    let attempts = 0;
    let noProgressCount = 0;
    const MAX_ATTEMPTS = 1000;
    const MAX_NO_PROGRESS_ATTEMPTS = 3;
    const PAGINATION_LIMIT = '50';

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

        // Add created_after parameter if we have a last update timestamp
        if (lastUpdate) {
          params.created_after = lastUpdate.toISOString();
        }

        console.log('Making request with:', {
          ...params,
          totalCollected: allPeople.length,
          attempt: attempts,
          noProgressCount
        });

        const response = await lumaApiRequest('calendar/list-people', params);

        if (!response || !Array.isArray(response.entries)) {
          console.error('Invalid response format:', response);
          break;
        }

        const people = response.entries;

        if (!people.length) {
          console.log('No people in response, stopping pagination');
          break;
        }

        const previousCount = allPeople.length;
        allPeople = allPeople.concat(people);

        if (allPeople.length === previousCount) {
          noProgressCount++;
          console.warn(`No new people received. Attempt ${noProgressCount} of ${MAX_NO_PROGRESS_ATTEMPTS}`);

          if (noProgressCount >= MAX_NO_PROGRESS_ATTEMPTS) {
            console.log(`Stopping after ${noProgressCount} attempts with no new people`);
            break;
          }
        } else {
          noProgressCount = 0;
          console.log(`Added ${allPeople.length - previousCount} new people. Total: ${allPeople.length}`);
        }

        hasMore = response.has_more === true;
        nextCursor = response.next_cursor;

        if (!hasMore || !nextCursor) {
          console.log('No more results available');
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('Failed to fetch people batch:', error);
        noProgressCount++;

        if (allPeople.length > 0 && noProgressCount >= MAX_NO_PROGRESS_ATTEMPTS) {
          console.log(`Returning ${allPeople.length} people collected before error`);
          return allPeople;
        }

        if (noProgressCount < MAX_NO_PROGRESS_ATTEMPTS) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        throw error;
      }
    }

    console.log(`Completed fetching people. Total count: ${allPeople.length}`);
    return allPeople;
  }

  private async fetchAllEvents(lastUpdate?: Date): Promise<any[]> {
    let allEvents: any[] = [];
    let nextCursor: string | null = null;
    let hasMore = true;
    let attempts = 0;
    let noProgressCount = 0;
    const MAX_ATTEMPTS = 20;
    const MAX_NO_PROGRESS_ATTEMPTS = 3;
    const PAGINATION_LIMIT = '50';
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

        // Add created_after parameter if we have a last update timestamp
        if (lastUpdate) {
          params.created_after = lastUpdate.toISOString();
        }

        console.log('Making events request with:', {
          ...params,
          totalCollected: allEvents.length,
          attempt: attempts,
          noProgressCount
        });

        const response = await lumaApiRequest('calendar/list-events', params);

        if (!response || !Array.isArray(response.entries)) {
          console.error('Invalid events response format:', response);
          break;
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

        if (allEvents.length === previousCount) {
          noProgressCount++;
          console.warn(`No new events received. Attempt ${noProgressCount} of ${MAX_NO_PROGRESS_ATTEMPTS}`);

          if (noProgressCount >= MAX_NO_PROGRESS_ATTEMPTS) {
            console.log(`Stopping after ${noProgressCount} attempts with no new events`);
            break;
          }
        } else {
          noProgressCount = 0;
          console.log(`Added ${allEvents.length - previousCount} new events. Total: ${allEvents.length}`);
        }

        hasMore = response.has_more === true;
        nextCursor = response.next_cursor;

        if (!hasMore || !nextCursor) {
          console.log('No more events results available');
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('Failed to fetch events batch:', error);
        noProgressCount++;

        if (allEvents.length > 0 && noProgressCount >= MAX_NO_PROGRESS_ATTEMPTS) {
          console.log(`Returning ${allEvents.length} events collected before error`);
          return allEvents;
        }

        if (noProgressCount < MAX_NO_PROGRESS_ATTEMPTS) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        throw error;
      }
    }

    console.log(`Completed fetching events. Total count: ${allEvents.length}`);
    return allEvents;
  }

  async performInitialUpdate(): Promise<void> {
    if (this.isCaching) {
      console.log('Cache update already in progress, waiting...');
      return;
    }

    console.log('Starting initial cache update...');
    await this.updateCache();
    console.log('Initial cache update completed');
  }

  private async updateCache() {
    if (this.isCaching) {
      console.log('Cache update already in progress, skipping...');
      return;
    }

    this.isCaching = true;
    console.log('Starting cache update process...');

    try {
      // Check when the last update was performed
      const lastUpdate = await storage.getLastCacheUpdate();
      const now = new Date();

      console.log(`Last cache update was ${lastUpdate ? lastUpdate.toISOString() : 'never'}`);

      // Fetch only new data from APIs based on last update time
      console.log('Fetching events and people...');

      const [eventsResult, peopleResult] = await Promise.allSettled([
        this.fetchAllEvents(lastUpdate),
        this.fetchAllPeople(lastUpdate)
      ]);

      let events: any[] = [];
      let allPeople: any[] = [];
      let eventsSuccess = false;
      let peopleSuccess = false;

      // Process events result
      if (eventsResult.status === 'fulfilled' && eventsResult.value.length > 0) {
        events = eventsResult.value;
        eventsSuccess = true;
        console.log(`Successfully fetched ${events.length} new events from API`);
      } else {
        console.log('No new events to sync');
      }

      // Process people result
      if (peopleResult.status === 'fulfilled' && peopleResult.value.length > 0) {
        allPeople = peopleResult.value;
        peopleSuccess = true;
        console.log(`Successfully fetched ${allPeople.length} new people from API`);
      } else {
        console.log('No new people to sync');
      }

      // Update events if we have new ones
      if (eventsSuccess) {
        try {
          console.log(`Processing ${events.length} new events...`);

          let successCount = 0;
          let errorCount = 0;

          for (const entry of events) {
            try {
              const eventData = entry.event;
              if (!eventData?.name || !eventData?.start_at || !eventData?.end_at) {
                console.warn('Missing required fields for event:', eventData);
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
              successCount++;
            } catch (error) {
              console.error('Failed to process event:', error);
              errorCount++;
            }
          }
          console.log(`Events processed: ${successCount} successful, ${errorCount} failed`);
        } catch (error) {
          console.error('Failed to update events:', error);
        }
      }

      // Update people if we have new ones
      if (peopleSuccess) {
        try {
          console.log(`Processing ${allPeople.length} new people...`);

          let successCount = 0;
          let errorCount = 0;

          for (const person of allPeople) {
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
              successCount++;
            } catch (error) {
              console.error('Failed to process person:', error);
              errorCount++;
            }
          }
          console.log(`People processed: ${successCount} successful, ${errorCount} failed`);
        } catch (error) {
          console.error('Failed to update people:', error);
        }
      }

      // Update last cache timestamp only if we had any successful updates
      if (eventsSuccess || peopleSuccess) {
        await storage.setLastCacheUpdate(now);
        console.log('Cache update completed successfully at', now.toISOString());
      } else {
        console.log('No new data to sync, keeping existing last update timestamp');
      }
    } catch (error) {
      console.error('Cache update process failed:', error);
    } finally {
      this.isCaching = false;
    }
  }

  startCaching() {
    // Set up a more reasonable interval for data that doesn't change often
    // 4 hours is a good balance between freshness and performance
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
    }
  }
}