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

  private async updateCache() {
    if (this.isCaching) return;

    this.isCaching = true;
    try {
      // Fetch events data from Luma API
      console.log('Fetching events from Luma API...');
      const eventsData = await lumaApiRequest('calendar/list-events');

      // Clear existing data
      await storage.clearEvents();
      await storage.clearPeople();

      // Process events
      const entries = eventsData.entries || [];
      console.log(`Processing ${entries.length} events...`);

      for (const entry of entries) {
        try {
          // The event data is nested under the event property
          const eventData = entry.event;

          if (!eventData || !eventData.name || !eventData.start_at || !eventData.end_at) {
            console.warn('Invalid event data:', entry);
            continue;
          }

          // Convert timestamps from Unix epoch to ISO string
          const startTime = new Date(eventData.start_at * 1000);
          const endTime = new Date(eventData.end_at * 1000);

          if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
            console.warn('Invalid date conversion for event:', eventData);
            continue;
          }

          const newEvent = await storage.insertEvent({
            title: eventData.name,
            description: eventData.description || null,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString()
          });
          console.log('Successfully inserted event:', newEvent);
        } catch (error) {
          console.error('Failed to process event:', error, entry);
        }
      }

      // Fetch and process people data
      console.log('Fetching people from Luma API...');
      const peopleData = await lumaApiRequest('calendar/list-people', {
        page: '1',
        limit: '100'
      });

      const people = peopleData.entries || [];
      console.log(`Processing ${people.length} people...`);

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
            avatarUrl: person.avatarUrl || person.user?.avatar_url || null
          });
          console.log('Successfully inserted person:', newPerson);
        } catch (error) {
          console.error('Failed to process person:', error, person);
        }
      }

      await storage.setLastCacheUpdate(new Date());
      console.log('Cache update completed successfully');
    } catch (error) {
      console.error('Failed to update cache:', error);
    } finally {
      this.isCaching = false;
    }
  }

  startCaching() {
    // Update immediately
    this.updateCache();

    // Then update every 5 minutes to keep data fresh
    this.cacheInterval = setInterval(() => {
      this.updateCache();
    }, 5 * 60 * 1000); // 5 minutes
  }

  stopCaching() {
    if (this.cacheInterval) {
      clearInterval(this.cacheInterval);
    }
  }
}