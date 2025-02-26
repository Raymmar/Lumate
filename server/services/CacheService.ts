
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
      const eventsData = await lumaApiRequest('calendar/list-events');
      const peopleData = await lumaApiRequest('calendar/list-people', {
        page: '1',
        limit: '100'
      });

      // Clear existing data
      await storage.clearEvents();
      await storage.clearPeople();
      
      // Store new data
      const events = eventsData.entries || [];
      for (const event of events) {
        await storage.insertEvent({
          title: event.name,
          description: event.description,
          startTime: new Date(event.start_at),
          endTime: new Date(event.end_at)
        });
      }

      const people = peopleData.entries || [];
      for (const person of people) {
        await storage.insertPerson({
          name: person.user?.name || 'Anonymous',
          email: person.email,
          role: person.user?.headline || null
        });
      }

      await storage.setLastCacheUpdate(new Date());
      console.log('Cache updated successfully');
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
