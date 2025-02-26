import { Event, InsertEvent, Person, InsertPerson, events, people } from "@shared/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from 'pg';
const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

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
    const [newEvent] = await db.insert(events).values(event).returning();
    console.log('Successfully inserted event:', newEvent);
    return newEvent;
  }

  async clearEvents(): Promise<void> {
    console.log('Clearing all events from database...');
    await db.delete(events);
    console.log('Successfully cleared events');
  }

  async getPeople(): Promise<Person[]> {
    return await db.select().from(people);
  }

  async insertPerson(person: InsertPerson): Promise<Person> {
    const [newPerson] = await db.insert(people).values(person).returning();
    return newPerson;
  }

  async clearPeople(): Promise<void> {
    await db.delete(people);
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