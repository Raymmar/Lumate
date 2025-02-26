import { Event, InsertEvent, Person, InsertPerson, events, people, cacheMetadata, InsertCacheMetadata } from "@shared/schema";
import { db } from "./db";
import { sql, eq } from "drizzle-orm";

export interface IStorage {
  // Events
  getEvents(): Promise<Event[]>;
  insertEvent(event: InsertEvent): Promise<Event>;
  clearEvents(): Promise<void>;

  // People
  getPeople(): Promise<Person[]>;
  insertPerson(person: InsertPerson): Promise<Person>;
  clearPeople(): Promise<void>;

  // Cache metadata
  getLastCacheUpdate(): Promise<Date | null>;
  setLastCacheUpdate(date: Date): Promise<void>;
}

export class PostgresStorage implements IStorage {
  async getEvents(): Promise<Event[]> {
    console.log('Fetching all events from database...');
    const result = await db.select().from(events);
    console.log(`Found ${result.length} events in database`);
    return result;
  }

  async insertEvent(event: InsertEvent): Promise<Event> {
    console.log('Upserting event into database:', event.api_id);

    // Create a raw SQL query for inserting with proper JSON handling
    const query = sql`
      INSERT INTO events (
        api_id, title, description, start_time, end_time, 
        cover_url, url, timezone, location, visibility, 
        meeting_url, calendar_api_id, created_at
      ) 
      VALUES (
        ${event.api_id}, 
        ${event.title}, 
        ${event.description}, 
        ${event.startTime}, 
        ${event.endTime},
        ${event.coverUrl}, 
        ${event.url}, 
        ${event.timezone}, 
        ${event.location ? JSON.stringify(event.location) : null}::jsonb, 
        ${event.visibility}, 
        ${event.meetingUrl}, 
        ${event.calendarApiId}, 
        ${event.createdAt}
      )
      ON CONFLICT (api_id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        cover_url = EXCLUDED.cover_url,
        url = EXCLUDED.url,
        timezone = EXCLUDED.timezone,
        location = EXCLUDED.location,
        visibility = EXCLUDED.visibility,
        meeting_url = EXCLUDED.meeting_url,
        calendar_api_id = EXCLUDED.calendar_api_id,
        created_at = EXCLUDED.created_at
      RETURNING *
    `;

    const result = await db.execute(query);
    const newEvent = result.rows[0] as Event;

    console.log('Successfully upserted event:', newEvent.api_id);
    return newEvent;
  }

  async clearEvents(): Promise<void> {
    console.log('Clearing all events from database...');
    await db.delete(events);
    console.log('Successfully cleared events');
  }

  async getPeople(): Promise<Person[]> {
    console.log('Fetching all people from database...');
    const result = await db.select().from(people);
    console.log(`Found ${result.length} people in database`);
    return result;
  }

  async insertPerson(person: InsertPerson): Promise<Person> {
    try {
      console.log('Attempting to upsert person:', person.email);

      const [newPerson] = await db
        .insert(people)
        .values(person)
        .onConflictDoUpdate({
          target: people.api_id,
          set: {
            email: person.email,
            userName: person.userName,
            fullName: person.fullName,
            avatarUrl: person.avatarUrl,
            role: person.role,
            phoneNumber: person.phoneNumber,
            bio: person.bio,
            organizationName: person.organizationName,
            jobTitle: person.jobTitle,
            createdAt: person.createdAt,
          },
        })
        .returning();

      console.log('Successfully upserted person:', newPerson.email);
      return newPerson;
    } catch (error) {
      console.error('Failed to upsert person:', person.email, error);
      throw error;
    }
  }

  async clearPeople(): Promise<void> {
    console.log('Clearing all people from database...');
    await db.delete(people);
    console.log('Successfully cleared people');
  }

  async getLastCacheUpdate(): Promise<Date | null> {
    try {
      const LAST_UPDATE_KEY = 'last_cache_update';
      const result = await db
        .select()
        .from(cacheMetadata)
        .where(eq(cacheMetadata.key, LAST_UPDATE_KEY))
        .limit(1);
      
      if (result.length === 0) {
        return null;
      }
      
      const timestamp = result[0].value;
      return new Date(timestamp);
    } catch (error) {
      console.error('Failed to get last cache update:', error);
      return null;
    }
  }

  async setLastCacheUpdate(date: Date): Promise<void> {
    const LAST_UPDATE_KEY = 'last_cache_update';
    try {
      const metadata: InsertCacheMetadata = {
        key: LAST_UPDATE_KEY,
        value: date.toISOString(),
      };
      
      await db
        .insert(cacheMetadata)
        .values(metadata)
        .onConflictDoUpdate({
          target: cacheMetadata.key,
          set: {
            value: metadata.value,
            updatedAt: new Date().toISOString(),
          }
        });
        
      console.log('Successfully updated last cache timestamp:', date.toISOString());
    } catch (error) {
      console.error('Failed to update last cache timestamp:', error);
      throw error;
    }
  }
}

export const storage = new PostgresStorage();