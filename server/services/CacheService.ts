import { lumaApiRequest } from '../routes';
import { storage } from '../storage';

export class CacheService {
  private static instance: CacheService;
  private cacheInterval: NodeJS.Timeout | null = null;
  private isCaching = false;
  private readonly PEOPLE_PAGE_SIZE = 100;

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
    let cursor: string | undefined;

    console.log('Starting to fetch all people from Luma API...');

    while (true) {
      try {
        const params: Record<string, string> = {
          limit: this.PEOPLE_PAGE_SIZE.toString()
        };

        if (cursor) {
          params.cursor = cursor;
        }

        console.log('Making request with params:', params);
        const peopleData = await lumaApiRequest('calendar/list-people', params);
        const people = peopleData.entries || [];

        // Log the response details
        console.log('Response details:', {
          newPeopleCount: people.length,
          totalSoFar: allPeople.length,
          hasMore: peopleData.has_more,
          nextCursor: peopleData.next_cursor
        });

        // Add all people from this batch
        allPeople = allPeople.concat(people);
        console.log(`Fetched ${people.length} people, Total: ${allPeople.length}`);

        // Break if no more results
        if (!peopleData.has_more) {
          console.log('No more results available');
          break;
        }

        // Update cursor for next request
        cursor = peopleData.next_cursor;

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('Failed to fetch people:', error);
        if (allPeople.length > 0) {
          console.log(`Returning ${allPeople.length} people fetched before error`);
          return allPeople;
        }
        throw error;
      }
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

      // Filter out duplicate events
      const seenEventIds = new Set<string>();
      const uniqueEvents = eventsData.entries.filter(entry => {
        const eventData = entry.event;
        if (!eventData?.api_id) {
          console.warn('Invalid event data:', eventData);
          return false;
        }
        const isNew = !seenEventIds.has(eventData.api_id);
        if (isNew) {
          seenEventIds.add(eventData.api_id);
          return true;
        }
        return false;
      });

      console.log(`Found ${uniqueEvents.length} unique events out of ${eventsData.entries.length} total`);
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
    let peopleProcessed = 0;
    let peopleStored = 0;

    try {
      // First, fetch all data before clearing the database
      console.log('Fetching all events and people...');
      const [events, allPeople] = await Promise.all([
        this.fetchAllEvents(),
        this.fetchAllPeople()
      ]);

      if (!events.length && !allPeople.length) {
        console.warn('No data found in Luma API response');
        return;
      }

      // Only clear existing data if we successfully fetched new data
      console.log('Clearing existing data from database...');
      await storage.clearEvents();
      await storage.clearPeople();

      // Store events
      if (events.length) {
        console.log(`Processing ${events.length} events...`);
        for (const entry of events) {
          try {
            const eventData = entry.event;
            if (!eventData?.name || !eventData?.start_at || !eventData?.end_at) {
              console.warn('Missing required fields for event:', eventData);
              continue;
            }

            const newEvent = await storage.insertEvent({
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

            console.log('Successfully stored event:', {
              id: newEvent.id,
              title: newEvent.title,
              api_id: newEvent.api_id
            });
          } catch (error) {
            console.error('Failed to process event:', error);
          }
        }
      }

      // Store people in batches
      if (allPeople.length) {
        console.log(`Processing ${allPeople.length} people...`);
        const batchSize = 50;
        for (let i = 0; i < allPeople.length; i += batchSize) {
          const batch = allPeople.slice(i, i + batchSize);
          console.log(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(allPeople.length / batchSize)}`);

          for (const person of batch) {
            try {
              peopleProcessed++;
              if (!person.api_id || !person.email) {
                console.warn(`Skipping person ${peopleProcessed} - Missing required fields:`, person);
                continue;
              }

              const newPerson = await storage.insertPerson({
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
              peopleStored++;

              if (peopleStored % 10 === 0) {
                console.log(`Progress: Stored ${peopleStored}/${allPeople.length} people`);
              }
            } catch (error) {
              console.error(`Failed to process person ${peopleProcessed}:`, error);
            }
          }
        }

        // Final status report
        console.log('Cache update completed successfully');
        console.log(`Final counts - Processed: ${peopleProcessed}, Successfully stored: ${peopleStored}`);

        // Verify final counts
        const [finalPeopleCount, finalEventsCount] = await Promise.all([
          storage.getPeople().then(p => p.length),
          storage.getEvents().then(e => e.length)
        ]);
        console.log(`Database counts - People: ${finalPeopleCount}, Events: ${finalEventsCount}`);
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