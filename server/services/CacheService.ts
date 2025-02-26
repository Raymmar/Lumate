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
      // Fetch data from Luma
      console.log('Fetching data from Luma API...');
      const eventsData = await lumaApiRequest('calendar/list-events');
      const peopleData = await lumaApiRequest('calendar/list-people', {
        page: '1',
        limit: '100'
      });

      // Log raw API responses for debugging
      console.log('Raw events data from Luma:', JSON.stringify(eventsData, null, 2));
      console.log('Raw people data from Luma:', JSON.stringify(peopleData, null, 2));

      // Clear existing data
      await storage.clearEvents();
      await storage.clearPeople();

      // Store new data
      const events = eventsData.entries || [];
      console.log(`Processing ${events.length} events...`);

      for (const event of events) {
        try {
          // Validate timestamps
          if (!event.start_at || !event.end_at || 
              typeof event.start_at !== 'number' || 
              typeof event.end_at !== 'number') {
            console.warn('Invalid timestamp for event:', event);
            continue;
          }

          const startTime = new Date(event.start_at * 1000);
          const endTime = new Date(event.end_at * 1000);

          // Validate date objects
          if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
            console.warn('Invalid date conversion for event:', event);
            continue;
          }

          const newEvent = await storage.insertEvent({
            title: event.name || 'Untitled Event',
            description: event.description || null,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString()
          });
          console.log('Successfully inserted event:', newEvent);
        } catch (error) {
          console.error('Failed to insert event:', error, event);
        }
      }

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
            userName: person.user?.name || null,
            avatarUrl: person.user?.avatar_url || null
          });
          console.log('Successfully inserted person:', newPerson);
        } catch (error) {
          console.error('Failed to insert person:', error, person);
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