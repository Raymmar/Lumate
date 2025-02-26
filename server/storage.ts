import { Event, InsertEvent, Person, InsertPerson, events, people } from "@shared/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import { db } from "./db";
import { desc } from "drizzle-orm";

export interface IStorage {
  // Events
  getEvents(): Promise<Event[]>;
  insertEvent(event: InsertEvent): Promise<Event>;
  clearEvents(): Promise<void>;

  // People
  getPeople(page?: number, limit?: number): Promise<{ people: Person[], total: number }>;
  insertPerson(person: InsertPerson): Promise<Person>;
  clearPeople(): Promise<void>;

  // Cache metadata
  getLastCacheUpdate(): Promise<Date | null>;
  setLastCacheUpdate(date: Date): Promise<void>;
}

export class PostgresStorage implements IStorage {
  async getEvents(): Promise<Event[]> {
    console.log('Fetching all events from database...');
    // Order by startTime descending to get newest events first
    const result = await db.select().from(events).orderBy(desc(events.startTime));
    console.log(`Found ${result.length} events in database`);
    return result;
  }

  async insertEvent(event: InsertEvent): Promise<Event> {
    console.log('Inserting event into database:', event);
    const [newEvent] = await db.insert(events).values([event]).returning();
    console.log('Successfully inserted event:', newEvent);
    return newEvent;
  }

  async clearEvents(): Promise<void> {
    console.log('Clearing all events from database...');
    await db.delete(events);
    console.log('Successfully cleared events');
  }

  async getPeople(page = 1, limit = 10): Promise<{ people: Person[], total: number }> {
    console.log(`Fetching people from database - page ${page}, limit ${limit}`);
    const offset = (page - 1) * limit;

    // Get total count
    const [{ count }] = await db
      .select({ count: db.fn.count() })
      .from(people) as [{ count: string }];

    const total = parseInt(count, 10);

    // Get paginated results
    const results = await db
      .select()
      .from(people)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(people.createdAt));

    console.log(`Found ${results.length} people (total: ${total})`);
    return { people: results, total };
  }

  async insertPerson(person: InsertPerson): Promise<Person> {
    console.log('Inserting person into database:', person);
    const [newPerson] = await db.insert(people).values([person]).returning();
    console.log('Successfully inserted person:', newPerson);
    return newPerson;
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