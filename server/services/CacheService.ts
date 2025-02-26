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
      
      // Check if we have data already before triggering a full sync
      this.instance.checkInitialDataLoadStatus()
        .then(hasData => {
          if (hasData) {
            console.log('Database already contains data, scheduling background sync');
            
            // Small delay before first sync to prevent impacting application startup
            setTimeout(() => {
              this.instance.updateCache();
            }, 5000); // 5 second delay
          } else {
            console.log('No existing data found, performing initial data load...');
            this.instance.updateCache();
          }
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

  private async fetchAllPeople(): Promise<any[]> {
    let allPeople: any[] = [];
    let nextCursor: string | null = null;
    let hasMore = true;
    let attempts = 0;
    let noProgressCount = 0;
    const MAX_ATTEMPTS = 1000;
    const MAX_NO_PROGRESS_ATTEMPTS = 3;
    const PAGINATION_LIMIT = '50';

    console.log('Starting to fetch all people from Luma API...');

    while (hasMore && attempts < MAX_ATTEMPTS && noProgressCount < MAX_NO_PROGRESS_ATTEMPTS) {
      try {
        attempts++;
        const params: Record<string, string> = {
          pagination_limit: PAGINATION_LIMIT
        };

        // For subsequent requests after first page, use the pagination_cursor
        if (nextCursor) {
          params.pagination_cursor = nextCursor;
        }

        // Log current state
        console.log('Making request with:', {
          pagination_cursor: nextCursor,
          pagination_limit: PAGINATION_LIMIT,
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

        // If no people in response, stop
        if (!people.length) {
          console.log('No people in response, stopping pagination');
          break;
        }

        const previousCount = allPeople.length;
        // Add this batch to our collection
        allPeople = allPeople.concat(people);

        // Check if we received any new people
        if (allPeople.length === previousCount) {
          noProgressCount++;
          console.warn(`No new people received. Attempt ${noProgressCount} of ${MAX_NO_PROGRESS_ATTEMPTS}`);

          if (noProgressCount >= MAX_NO_PROGRESS_ATTEMPTS) {
            console.log(`Stopping after ${noProgressCount} attempts with no new people`);
            break;
          }
        } else {
          // Reset counter if we got new people
          noProgressCount = 0;
          console.log(`Added ${allPeople.length - previousCount} new people. Total: ${allPeople.length}`);
        }

        // Update pagination state
        hasMore = response.has_more === true;
        nextCursor = response.next_cursor;

        if (!hasMore) {
          console.log('No more results available');
          break;
        }

        if (!nextCursor) {
          console.log('No next cursor provided, stopping pagination');
          break;
        }

        // Add a small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('Failed to fetch people batch:', error);
        noProgressCount++;
        console.warn(`Request failed. Attempt ${noProgressCount} of ${MAX_NO_PROGRESS_ATTEMPTS}`);

        // If we have collected some data and reached max no-progress attempts, return what we have
        if (allPeople.length > 0 && noProgressCount >= MAX_NO_PROGRESS_ATTEMPTS) {
          console.log(`Returning ${allPeople.length} people collected before error after ${noProgressCount} failed attempts`);
          return allPeople;
        }

        if (noProgressCount < MAX_NO_PROGRESS_ATTEMPTS) {
          // Wait a bit longer before retrying after an error
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        throw error;
      }
    }

    if (attempts >= MAX_ATTEMPTS) {
      console.warn(`Reached maximum attempts (${MAX_ATTEMPTS}), stopping pagination`);
    }

    if (noProgressCount >= MAX_NO_PROGRESS_ATTEMPTS) {
      console.warn(`Stopped after ${noProgressCount} attempts without new data`);
    }

    console.log(`Completed fetching all people. Total count: ${allPeople.length}`);
    return allPeople;
  }

  private async fetchAllEvents(): Promise<any[]> {
    let allEvents: any[] = [];
    let nextCursor: string | null = null;
    let hasMore = true;
    let attempts = 0;
    let noProgressCount = 0;
    const MAX_ATTEMPTS = 20;
    const MAX_NO_PROGRESS_ATTEMPTS = 3;
    const PAGINATION_LIMIT = '50';
    const seenEventIds = new Set<string>();

    console.log('Starting to fetch all events from Luma API...');

    while (hasMore && attempts < MAX_ATTEMPTS && noProgressCount < MAX_NO_PROGRESS_ATTEMPTS) {
      try {
        attempts++;
        const params: Record<string, string> = {
          pagination_limit: PAGINATION_LIMIT
        };

        // For subsequent requests after first page, use the pagination_cursor
        if (nextCursor) {
          params.pagination_cursor = nextCursor;
        }

        // Log current state
        console.log('Making events request with:', {
          pagination_cursor: nextCursor,
          pagination_limit: PAGINATION_LIMIT,
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

        // If no events in response, stop
        if (!events.length) {
          console.log('No events in response, stopping pagination');
          break;
        }

        const previousCount = allEvents.length;
        
        // Filter and add unique events to our collection
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

        // Check if we received any new events
        if (allEvents.length === previousCount) {
          noProgressCount++;
          console.warn(`No new events received. Attempt ${noProgressCount} of ${MAX_NO_PROGRESS_ATTEMPTS}`);

          if (noProgressCount >= MAX_NO_PROGRESS_ATTEMPTS) {
            console.log(`Stopping after ${noProgressCount} attempts with no new events`);
            break;
          }
        } else {
          // Reset counter if we got new events
          noProgressCount = 0;
          console.log(`Added ${allEvents.length - previousCount} new events. Total: ${allEvents.length}`);
        }

        // Update pagination state
        hasMore = response.has_more === true;
        nextCursor = response.next_cursor;

        if (!hasMore) {
          console.log('No more events results available');
          break;
        }

        if (!nextCursor) {
          console.log('No next cursor provided for events, stopping pagination');
          break;
        }

        // Add a small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('Failed to fetch events batch:', error);
        noProgressCount++;
        console.warn(`Events request failed. Attempt ${noProgressCount} of ${MAX_NO_PROGRESS_ATTEMPTS}`);

        // If we have collected some data and reached max no-progress attempts, return what we have
        if (allEvents.length > 0 && noProgressCount >= MAX_NO_PROGRESS_ATTEMPTS) {
          console.log(`Returning ${allEvents.length} events collected before error after ${noProgressCount} failed attempts`);
          return allEvents;
        }

        if (noProgressCount < MAX_NO_PROGRESS_ATTEMPTS) {
          // Wait a bit longer before retrying after an error
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        throw error;
      }
    }

    if (attempts >= MAX_ATTEMPTS) {
      console.warn(`Reached maximum attempts (${MAX_ATTEMPTS}) for events, stopping pagination`);
    }

    if (noProgressCount >= MAX_NO_PROGRESS_ATTEMPTS) {
      console.warn(`Stopped events fetch after ${noProgressCount} attempts without new data`);
    }

    console.log(`Completed fetching all events. Total count: ${allEvents.length}`);
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
      const timeSinceLastUpdate = lastUpdate ? now.getTime() - lastUpdate.getTime() : Infinity;
      
      console.log(`Last cache update was ${lastUpdate ? lastUpdate.toISOString() : 'never'}`);
      
      // Get current database stats to make smarter decisions
      const existingEvents = await storage.getEvents();
      const existingPeople = await storage.getPeople();
      
      console.log(`Database currently has ${existingEvents.length} events and ${existingPeople.length} people`);
      
      // Create sets of existing API IDs for faster lookups
      const existingEventIds = new Set(existingEvents.map(e => e.api_id));
      const existingPersonIds = new Set(existingPeople.map(p => p.api_id));
      
      // Calculate if this is initial load or incremental update
      const isInitialLoad = existingEvents.length === 0 && existingPeople.length === 0;
      
      if (isInitialLoad) {
        console.log('No existing data found. Performing initial data load...');
      } else {
        console.log('Performing incremental update...');
      }
      
      // Fetch all data from APIs
      console.log('Fetching events and people...');
      
      // Use Promise.allSettled to handle partial failures
      const [eventsResult, peopleResult] = await Promise.allSettled([
        this.fetchAllEvents(),
        this.fetchAllPeople()
      ]);
      
      let events: any[] = [];
      let allPeople: any[] = [];
      let eventsSuccess = false;
      let peopleSuccess = false;
      
      // Process events result
      if (eventsResult.status === 'fulfilled' && eventsResult.value.length > 0) {
        events = eventsResult.value;
        eventsSuccess = true;
        console.log(`Successfully fetched ${events.length} events from API`);
      } else {
        console.error('Failed to fetch events: ', 
          eventsResult.status === 'rejected' ? eventsResult.reason : 'No events found');
      }
      
      // Process people result
      if (peopleResult.status === 'fulfilled' && peopleResult.value.length > 0) {
        allPeople = peopleResult.value;
        peopleSuccess = true;
        console.log(`Successfully fetched ${allPeople.length} people from API`);
      } else {
        console.error('Failed to fetch people: ', 
          peopleResult.status === 'rejected' ? peopleResult.reason : 'No people found');
      }
      
      // Only proceed if we have some successful data
      if (!eventsSuccess && !peopleSuccess) {
        console.error('Failed to fetch any data from APIs, keeping existing data');
        return;
      }
      
      // Update events if successful
      if (eventsSuccess) {
        try {
          // Filter events that need to be processed (new or updated)
          let eventsToProcess = events;
          
          // For performance, if we have lots of events, only process new or updated ones
          if (!isInitialLoad && existingEvents.length > 0) {
            console.log('Filtering events to only process new or modified ones...');
            
            // In a real app with full API access, we might filter by updated_at timestamp
            // For now, we'll just check if we have the API ID already
            eventsToProcess = events.filter(entry => {
              const eventData = entry.event;
              return !existingEventIds.has(eventData.api_id);
            });
            
            console.log(`Filtered ${events.length} events down to ${eventsToProcess.length} new events`);
          }
          
          // Process and store/update events
          console.log(`Processing ${eventsToProcess.length} events...`);
          let successCount = 0;
          let errorCount = 0;
          
          for (const entry of eventsToProcess) {
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

      // Update people if successful
      if (peopleSuccess) {
        try {
          // Filter people that need to be processed (new or updated)
          let peopleToProcess = allPeople;
          
          // For performance, if we have lots of people, only process new or updated ones
          if (!isInitialLoad && existingPeople.length > 0) {
            console.log('Filtering people to only process new ones...');
            
            // In a real app with full API access, we might filter by updated_at timestamp
            // For now, we'll just check if we have the API ID already
            peopleToProcess = allPeople.filter(person => {
              return !existingPersonIds.has(person.api_id);
            });
            
            console.log(`Filtered ${allPeople.length} people down to ${peopleToProcess.length} new people`);
          }
          
          // Process and store/update people
          console.log(`Processing ${peopleToProcess.length} people...`);
          let successCount = 0;
          let errorCount = 0;
          
          for (const person of peopleToProcess) {
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

      // Update last cache timestamp
      await storage.setLastCacheUpdate(new Date());
      console.log('Cache update completed successfully at', new Date().toISOString());
    } catch (error) {
      console.error('Cache update process failed:', error);
    } finally {
      this.isCaching = false;
    }
  }

  startCaching() {
    // The constructor sets up a delayed initial sync using checkInitialDataLoadStatus
    // so we don't need to call updateCache() here immediately
    
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