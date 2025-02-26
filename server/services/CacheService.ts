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
      console.log('Clearing existing events and people...');
      await storage.clearEvents();
      await storage.clearPeople();

      // Process events
      const entries = eventsData.entries || [];
      console.log(`Found ${entries.length} events to process`);

      // Track successful insertions
      let successfulInserts = 0;

      for (const entry of entries) {
        try {
          const eventData = entry.event;
          if (!eventData) {
            console.warn('Event data is missing:', entry);
            continue;
          }

          // Log the event data we're about to process
          console.log('Processing event:', {
            name: eventData.name,
            start_at: eventData.start_at,
            end_at: eventData.end_at,
            description: eventData.description?.substring(0, 50) + '...'
          });

          // Convert timestamps and validate dates
          const startTime = new Date(Number(eventData.start_at) * 1000);
          const endTime = new Date(Number(eventData.end_at) * 1000);

          if (!eventData.name || !eventData.start_at || !eventData.end_at) {
            console.warn('Skipping event - missing required fields:', eventData);
            continue;
          }

          if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
            console.warn('Skipping event - invalid dates:', {
              start: eventData.start_at,
              end: eventData.end_at
            });
            continue;
          }

          // Insert the event into our database
          const newEvent = await storage.insertEvent({
            title: eventData.name,
            description: eventData.description || null,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString()
          });

          console.log('Successfully stored event:', {
            id: newEvent.id,
            title: newEvent.title,
            startTime: newEvent.startTime
          });

          successfulInserts++;
        } catch (error) {
          console.error('Failed to process event:', error);
          console.error('Problematic event data:', entry);
        }
      }

      console.log(`Successfully processed ${successfulInserts} out of ${entries.length} events`);

      // Process people data
      console.log('Fetching people from Luma API...');
      const peopleData = await lumaApiRequest('calendar/list-people', {
        page: '1',
        limit: '100'
      });

      const people = peopleData.entries || [];
      console.log(`Processing ${people.length} people...`);

      let successfulPeopleInserts = 0;

      for (const person of people) {
        try {
          if (!person.api_id || !person.email) {
            console.warn('Skipping person - missing required fields:', person);
            continue;
          }

          const newPerson = await storage.insertPerson({
            api_id: person.api_id,
            email: person.email,
            userName: person.userName || person.user?.name || null,
            avatarUrl: person.avatarUrl || person.user?.avatar_url || null
          });

          console.log('Successfully stored person:', {
            id: newPerson.id,
            email: newPerson.email
          });

          successfulPeopleInserts++;
        } catch (error) {
          console.error('Failed to process person:', error);
          console.error('Problematic person data:', person);
        }
      }

      console.log(`Successfully processed ${successfulPeopleInserts} out of ${people.length} people`);

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