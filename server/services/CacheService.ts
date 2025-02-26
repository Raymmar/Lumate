import { lumaApiRequest } from '../routes';
import { storage } from '../storage';

export class CacheService {
  private static instance: CacheService;
  private cacheInterval: NodeJS.Timeout | null = null;
  private isCaching = false;

  private constructor() {
    this.startCaching();
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new CacheService();
    }
    return this.instance;
  }

  private async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries = 5,
    initialDelay = 1000
  ): Promise<T> {
    let retries = 0;
    while (true) {
      try {
        return await operation();
      } catch (error: any) {
        if (error?.message?.includes('rate limit') && retries < maxRetries) {
          const delay = initialDelay * Math.pow(2, retries);
          console.log(`Rate limit hit, waiting ${delay}ms before retry ${retries + 1}/${maxRetries}`);
          await this.sleep(delay);
          retries++;
          continue;
        }
        throw error;
      }
    }
  }

  private async updateCache() {
    if (this.isCaching) {
      console.log('Cache update already in progress, skipping...');
      return;
    }

    this.isCaching = true;
    try {
      // Fetch and store events first
      console.log('Fetching events from Luma API...');
      const eventsData = await this.retryWithBackoff(() => 
        lumaApiRequest('calendar/list-events')
      );

      if (!eventsData?.entries?.length) {
        console.warn('No events found in Luma API response');
        return;
      }

      const eventEntries = eventsData.entries;
      console.log(`Found ${eventEntries.length} events to process`);

      // Store new events
      const processedEvents = [];
      for (const entry of eventEntries) {
        try {
          const eventData = entry.event;
          if (!eventData || !eventData.name || !eventData.start_at || !eventData.end_at) {
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
          processedEvents.push(newEvent);
        } catch (error) {
          console.error('Failed to process event:', error);
        }
      }

      console.log(`Successfully processed ${processedEvents.length} events`);

      // Now fetch and store people
      console.log('Fetching people from Luma API...');
      let page = 1;
      const processedPeople = [];

      while (true) {
        try {
          console.log(`Fetching people page ${page}...`);
          const peopleData = await this.retryWithBackoff(() => 
            lumaApiRequest('calendar/list-people', {
              page: page.toString(),
              limit: '100'
            })
          );

          const people = peopleData.entries || [];
          if (people.length === 0) {
            console.log('No more people to fetch');
            break;
          }

          console.log(`Processing ${people.length} people from page ${page}`);

          for (const person of people) {
            try {
              if (!person.api_id || !person.email) {
                console.warn('Missing required fields for person:', person);
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
              processedPeople.push(newPerson);
            } catch (error) {
              console.error('Failed to process person:', error);
            }
          }

          page++;
          // Add a small delay between pages to avoid rate limits
          await this.sleep(1000);
        } catch (error) {
          console.error(`Failed to fetch people page ${page}:`, error);
          break;
        }
      }

      console.log(`Successfully processed ${processedPeople.length} total people`);
      await storage.setLastCacheUpdate(new Date());
      console.log('Cache update completed');
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