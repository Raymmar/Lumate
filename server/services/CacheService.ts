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
      // Log the incoming timestamp details
      console.log('Parsing timestamp:', {
        value: timestamp,
        type: typeof timestamp,
        isNumeric: !isNaN(Number(timestamp))
      });

      // If it's a string that could be an ISO date
      if (typeof timestamp === 'string' && isNaN(Number(timestamp))) {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) {
          console.log('Parsed as ISO string:', date.toISOString());
          return date;
        }
      }

      // If it's a Unix timestamp (either string or number)
      const numericTimestamp = Number(timestamp);
      if (!isNaN(numericTimestamp)) {
        // Keep the timestamp in UTC
        const date = new Date(numericTimestamp * 1000);
        if (!isNaN(date.getTime())) {
          console.log('Parsed as Unix timestamp:', date.toISOString());
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
          const eventData = entry.event;
          if (!eventData) {
            console.warn('Event data missing in entry:', entry);
            continue;
          }

          if (!eventData.name || !eventData.start_at || !eventData.end_at) {
            console.warn('Missing required fields for event:', eventData);
            continue;
          }

          // Log raw event data before parsing
          console.log('Raw event data:', {
            name: eventData.name,
            start_at: eventData.start_at,
            end_at: eventData.end_at,
            timezone: eventData.timezone
          });

          const startTime = this.parseTimestamp(eventData.start_at);
          const endTime = this.parseTimestamp(eventData.end_at);
          const createdAt = eventData.created_at ? this.parseTimestamp(eventData.created_at) : null;

          // Debug log for timestamp processing
          console.log('Processing event timestamps:', {
            event_name: eventData.name,
            original_start: eventData.start_at,
            parsed_start: startTime.toISOString(),
            original_end: eventData.end_at,
            parsed_end: endTime.toISOString(),
            timezone: eventData.timezone
          });

          // Extract location data if available
          const location = eventData.geo_address_json ? {
            city: eventData.geo_address_json.city,
            region: eventData.geo_address_json.region,
            country: eventData.geo_address_json.country,
            latitude: eventData.geo_latitude,
            longitude: eventData.geo_longitude,
            full_address: eventData.geo_address_json.full_address,
          } : null;

          const newEvent = await storage.insertEvent({
            api_id: eventData.api_id,
            title: eventData.name,
            description: eventData.description || null,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            coverUrl: eventData.cover_url || null,
            url: eventData.url || null,
            timezone: eventData.timezone || null,
            location: location,
            visibility: eventData.visibility || null,
            meetingUrl: eventData.meeting_url || eventData.zoom_meeting_url || null,
            calendarApiId: eventData.calendar_api_id || null,
            createdAt: createdAt?.toISOString() || null,
          });

          console.log('Successfully stored event:', {
            id: newEvent.id,
            title: newEvent.title,
            api_id: newEvent.api_id,
            startTime: newEvent.startTime,
            original_start: eventData.start_at,
            timezone: newEvent.timezone
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

          const createdAt = person.created_at ? this.parseTimestamp(person.created_at) : null;

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
            createdAt: createdAt?.toISOString() || null,
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