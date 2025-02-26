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
    }
    return this.instance;
  }

  private async fetchAllPeople(): Promise<any[]> {
    let allPeople: any[] = [];
    let nextCursor: string | null = null;
    let prevCursor: string | null = null;
    let hasMore = true;
    let attempts = 0;
    let noProgressCount = 0;
    const MAX_ATTEMPTS = 1000;
    const MAX_NO_PROGRESS_ATTEMPTS = 3;

    console.log('Starting to fetch all people from Luma API...');

    while (hasMore && attempts < MAX_ATTEMPTS && noProgressCount < MAX_NO_PROGRESS_ATTEMPTS) {
      try {
        attempts++;
        const params: Record<string, string> = {};

        if (allPeople.length > 0 && nextCursor) {
          params.cursor = nextCursor;
          params.limit = '50';
        }

        console.log('Making request with:', {
          cursor: nextCursor,
          prevCursor,
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
        prevCursor = nextCursor;
        nextCursor = response.next_cursor;

        if (nextCursor && nextCursor === prevCursor) {
          console.log('Cursor is not progressing, stopping pagination');
          break;
        }

        if (!hasMore) {
          console.log('No more results available');
          break;
        }

        if (!nextCursor) {
          console.log('No next cursor provided, stopping pagination');
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('Failed to fetch people batch:', error);
        noProgressCount++;
        console.warn(`Request failed. Attempt ${noProgressCount} of ${MAX_NO_PROGRESS_ATTEMPTS}`);

        if (allPeople.length > 0 && noProgressCount >= MAX_NO_PROGRESS_ATTEMPTS) {
          console.log(`Returning ${allPeople.length} people collected before error after ${noProgressCount} failed attempts`);
          return allPeople;
        }

        if (noProgressCount < MAX_NO_PROGRESS_ATTEMPTS) {
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
    try {
      console.log('Fetching events from Luma API...');
      const eventsData = await lumaApiRequest('calendar/list-events');

      if (!eventsData?.entries?.length) {
        console.warn('No events found in Luma API response');
        return [];
      }

      const uniqueEvents = eventsData.entries.filter(entry => {
        const eventData = entry.event;
        if (!eventData?.api_id) {
          console.warn('Invalid event data:', eventData);
          return false;
        }
        return true;
      });

      console.log(`Found ${uniqueEvents.length} events`);
      return uniqueEvents;
    } catch (error) {
      console.error('Failed to fetch events:', error);
      throw error;
    }
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
      console.log('Fetching all events and people...');
      const [events, allPeople] = await Promise.all([
        this.fetchAllEvents(),
        this.fetchAllPeople()
      ]);

      if (!events.length && !allPeople.length) {
        console.warn('No data found in Luma API response');
        return;
      }

      // Process events
      if (events.length) {
        console.log(`Processing ${events.length} events...`);
        for (const entry of events) {
          try {
            const eventData = entry.event;
            if (!eventData?.name || !eventData?.start_at || !eventData?.end_at) {
              console.warn('Missing required fields for event:', eventData);
              continue;
            }

            const newEventData = {
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
            };

            const existingEvent = await storage.getEventByApiId(eventData.api_id);
            if (existingEvent) {
              await storage.updateEvent(eventData.api_id, newEventData);
            } else {
              await storage.insertEvent(newEventData);
            }
          } catch (error) {
            console.error('Failed to process event:', error);
          }
        }
      }

      // Process people
      if (allPeople.length) {
        console.log(`Processing ${allPeople.length} people...`);
        for (const person of allPeople) {
          try {
            if (!person.api_id || !person.email) {
              console.warn('Skipping person - Missing required fields:', person);
              continue;
            }

            const newPersonData = {
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
            };

            const existingPerson = await storage.getPersonByApiId(person.api_id);
            if (existingPerson) {
              await storage.updatePerson(person.api_id, newPersonData);
            } else {
              await storage.insertPerson(newPersonData);
            }
          } catch (error) {
            console.error('Failed to process person:', error);
          }
        }
      }

      await storage.setLastCacheUpdate(new Date());
    } catch (error) {
      console.error('Cache update failed:', error);
    } finally {
      this.isCaching = false;
    }
  }

  startCaching() {
    // Update immediately
    this.updateCache();

    // Then update every 5 minutes
    this.cacheInterval = setInterval(() => {
      this.updateCache();
    }, 5 * 60 * 1000);
  }

  stopCaching() {
    if (this.cacheInterval) {
      clearInterval(this.cacheInterval);
    }
  }
}