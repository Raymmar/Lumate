import { Event, InsertEvent, Person, InsertPerson, events, people } from "@shared/schema";
import { db } from "./db";

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
    console.log('Inserting event into database:', event);
    // Explicitly type and validate the location object before insertion
    const locationData = event.location ? {
      city: event.location.city || null,
      region: event.location.region || null,
      country: event.location.country || null,
      latitude: event.location.latitude || null,
      longitude: event.location.longitude || null,
      full_address: event.location.full_address || null,
    } : null;

    const [newEvent] = await db.insert(events).values({
      ...event,
      location: locationData,
    }).returning();
    console.log('Successfully inserted event:', newEvent);
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
      console.log('Attempting to insert person:', person.email);
      const [newPerson] = await db.insert(people).values([person]).returning();
      console.log('Successfully inserted person:', newPerson.email);
      return newPerson;
    } catch (error) {
      console.error('Failed to insert person:', person.email, error);
      throw error;
    }
  }

  async clearPeople(): Promise<void> {
    console.log('Clearing all people from database...');
    await db.delete(people);
    console.log('Successfully cleared people');
  }

  async getLastCacheUpdate(): Promise<Date | null> {
    // For now, just return null since we haven't implemented cache metadata table
    return null;
  }

  async setLastCacheUpdate(date: Date): Promise<void> {
    // TODO: Implement cache metadata table
  }
}

export const storage = new PostgresStorage();