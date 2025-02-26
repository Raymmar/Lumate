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

  private parseTimestamp(timestamp: string | number): Date {
    try {
      // If it's a string that could be an ISO date
      if (typeof timestamp === 'string' && isNaN(Number(timestamp))) {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }

      // If it's a Unix timestamp (either string or number)
      const numericTimestamp = Number(timestamp);
      if (!isNaN(numericTimestamp)) {
        // Check if we need to multiply by 1000 (if it's in seconds instead of milliseconds)
        const multiplier = numericTimestamp < 10000000000 ? 1000 : 1;
        const date = new Date(numericTimestamp * multiplier);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }

      throw new Error(`Invalid timestamp format: ${timestamp}`);
    } catch (error) {
      throw new Error(`Failed to parse timestamp ${timestamp}: ${error}`);
    }
  }

  private async updateCache() {
    if (this.isCaching) {
      console.log('Cache update already in progress, skipping...');
      return;
    }

    this.isCaching = true;
    try {
      // Fetch events data from Luma API
      console.log('Fetching events from Luma API...');
      const eventsData = await lumaApiRequest('calendar/list-events');

      // Log the complete raw response for debugging
      console.log('Raw Luma API response:', JSON.stringify(eventsData, null, 2));

      if (!eventsData?.entries?.length) {
        console.warn('No events found in Luma API response');
        return;
      }

      // Clear existing data before updating
      console.log('Clearing existing data...');
      await storage.clearEvents();
      await storage.clearPeople();

      console.log(`Found ${eventsData.entries.length} events to process`);

      for (const entry of eventsData.entries) {
        try {
          // Extract event data from the nested structure
          const eventData = entry.event;
          if (!eventData) {
            console.warn('Event data missing in entry:', entry);
            continue;
          }

          // Log the raw event data we're processing
          console.log('Processing event:', {
            name: eventData.name,
            start_at: eventData.start_at,
            end_at: eventData.end_at,
            type_start: typeof eventData.start_at,
            type_end: typeof eventData.end_at
          });

          // Validate required fields
          if (!eventData.name || !eventData.start_at || !eventData.end_at) {
            console.warn('Missing required fields for event:', {
              hasName: !!eventData.name,
              hasStart: !!eventData.start_at,
              hasEnd: !!eventData.end_at
            });
            continue;
          }

          // Convert timestamps
          let startTime: Date, endTime: Date;
          try {
            startTime = this.parseTimestamp(eventData.start_at);
            endTime = this.parseTimestamp(eventData.end_at);

            console.log('Parsed timestamps:', {
              start: startTime.toISOString(),
              end: endTime.toISOString()
            });
          } catch (error) {
            console.error('Failed to parse event timestamps:', error);
            continue;
          }

          // Insert event
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

        } catch (error) {
          console.error('Failed to process event:', error);
        }
      }

      // Process people data
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

          await storage.insertPerson({
            api_id: person.api_id,
            email: person.email,
            userName: person.userName || person.user?.name || null,
            avatarUrl: person.avatarUrl || person.user?.avatar_url || null
          });
        } catch (error) {
          console.error('Failed to process person:', error);
        }
      }

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