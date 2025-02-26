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
    let currentPage = 1;
    let hasMorePeople = true;
    const allPeople: any[] = [];
    let totalFetched = 0;
    const seenApiIds = new Set<string>();
    let nextCursor: string | undefined;

    console.log('Starting to fetch all people from Luma API...');

    while (hasMorePeople) {
      try {
        console.log(`Fetching people page ${currentPage}...`);
        const params: Record<string, string> = {
          limit: this.PEOPLE_PAGE_SIZE.toString()
        };

        if (nextCursor) {
          params.cursor = nextCursor;
        }

        const peopleData = await lumaApiRequest('calendar/list-people', params);

        // Log the complete response for debugging
        console.log(`Complete response from page ${currentPage}:`, JSON.stringify(peopleData, null, 2));

        const people = peopleData.entries || [];
        const pageCount = people.length;

        // Check for duplicates and new entries
        const newPeopleCount = people.filter(person => {
          if (!person || !person.api_id) {
            console.warn('Invalid person object:', person);
            return false;
          }
          const isDuplicate = seenApiIds.has(person.api_id);
          seenApiIds.add(person.api_id);
          return !isDuplicate;
        }).length;

        console.log(`Page ${currentPage}:`, {
          totalInResponse: pageCount,
          newPeople: newPeopleCount,
          duplicates: pageCount - newPeopleCount,
          hasMore: peopleData.has_more,
          nextCursor: peopleData.next_cursor
        });

        // Continue even if we see duplicates, just track what's new
        allPeople.push(...people);
        totalFetched += newPeopleCount;
        console.log(`Total unique people fetched so far: ${totalFetched}`);

        // Continue if we have more pages according to the API
        hasMorePeople = peopleData.has_more === true && peopleData.next_cursor !== undefined;
        nextCursor = peopleData.next_cursor;

        if (!hasMorePeople || !nextCursor) {
          console.log('No more pages available or next cursor is missing');
          break;
        }

        currentPage++;

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to fetch people page ${currentPage}:`, error);
        // If we've already fetched some data, return what we have
        if (allPeople.length > 0) {
          console.log(`Returning ${allPeople.length} people fetched before error`);
          return allPeople;
        }
        throw error;
      }
    }

    console.log(`Completed fetching all people. Total unique count: ${totalFetched}`);
    return allPeople;
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
      console.log('Fetching events from Luma API...');
      const eventsData = await lumaApiRequest('calendar/list-events');
      console.log('Fetching people from Luma API...');
      const allPeople = await this.fetchAllPeople();

      if (!eventsData?.entries?.length && !allPeople?.length) {
        console.warn('No data found in Luma API response');
        return;
      }

      // Only clear existing data if we successfully fetched new data
      console.log('Clearing existing data from database...');
      await storage.clearEvents();
      await storage.clearPeople();

      // Store events
      if (eventsData?.entries?.length) {
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

      // Store people in batches to avoid memory issues
      if (allPeople?.length) {
        console.log(`Retrieved ${allPeople.length} total people from API, starting database insertion...`);

        const batchSize = 50;
        for (let i = 0; i < allPeople.length; i += batchSize) {
          const batch = allPeople.slice(i, i + batchSize);
          const batchNumber = Math.floor(i / batchSize) + 1;
          const totalBatches = Math.ceil(allPeople.length / batchSize);
          console.log(`Processing batch ${batchNumber} of ${totalBatches} (${batch.length} people)`);

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

        // Verify final count in database
        const finalDbCount = (await storage.getPeople()).length;
        console.log(`Total people in database after update: ${finalDbCount}`);
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