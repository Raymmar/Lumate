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

          // Log raw event data
          console.log('Raw event data:', {
            name: eventData.name,
            start_at: eventData.start_at,
            end_at: eventData.end_at,
            timezone: eventData.timezone
          });

          // Store the timestamps with timezone information
          const newEvent = await storage.insertEvent({
            api_id: eventData.api_id,
            title: eventData.name,
            description: eventData.description || null,
            startTime: eventData.start_at, // This is already in ISO format with UTC timezone
            endTime: eventData.end_at,     // This is already in ISO format with UTC timezone
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
            api_id: newEvent.api_id,
            startTime: newEvent.startTime,
            timezone: newEvent.timezone
          });

        } catch (error) {
          console.error('Failed to process event:', error);
        }
      }

      // Process people data
      console.log('Fetching people from Luma API...');
      let page = 1;
      let hasMorePeople = true;
      const allPeople: any[] = [];

      while (hasMorePeople) {
        console.log(`Fetching people page ${page}...`);
        const peopleData = await lumaApiRequest('calendar/list-people', {
          page: page.toString(),
          limit: '100'  // Maximum allowed per page
        });

        const people = peopleData.entries || [];
        console.log(`Retrieved ${people.length} people from page ${page}`);

        if (people.length === 0) {
          hasMorePeople = false;
          console.log('No more people to fetch');
          break;
        }

        allPeople.push(...people);
        page++;
      }

      console.log(`Processing ${allPeople.length} total people...`);

      for (const person of allPeople) {
        try {
          if (!person.api_id || !person.email) {
            console.warn('Missing required fields for person:', person);
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