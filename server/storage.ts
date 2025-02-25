import { 
  events, people, auth_users,
  type Event, type InsertEvent,
  type Person, type InsertPerson,
  type AuthUser, type InsertAuthUser
} from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pkg from 'pg';
const { Client } = pkg;

// Create the database client
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

// Connect to the database
client.connect();

// Create the database instance
export const db = drizzle(client);

export interface IStorage {
  // Events
  getEvents(): Promise<Event[]>;
  getEventByApiId(apiId: string): Promise<Event | undefined>;
  upsertEvent(event: InsertEvent): Promise<Event>;

  // People
  getPeople(page?: number, limit?: number): Promise<{ people: Person[], total: number }>;
  getPersonByApiId(apiId: string): Promise<Person | undefined>;
  getPersonByEmail(email: string): Promise<Person | undefined>;
  upsertPerson(person: InsertPerson): Promise<Person>;

  // Auth
  createAuthUser(user: InsertAuthUser): Promise<AuthUser>;
  getAuthUserByEmail(email: string): Promise<AuthUser | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Events
  async getEvents(): Promise<Event[]> {
    return await db.select().from(events).orderBy(events.start_at);
  }

  async getEventByApiId(apiId: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.api_id, apiId));
    return event;
  }

  async upsertEvent(event: InsertEvent): Promise<Event> {
    // Try to find existing event
    const existing = await this.getEventByApiId(event.api_id);

    if (existing) {
      const [updated] = await db
        .update(events)
        .set({ ...event, last_synced_at: new Date() })
        .where(eq(events.id, existing.id))
        .returning();
      return updated;
    }

    // Insert new event
    const [newEvent] = await db
      .insert(events)
      .values({ ...event, last_synced_at: new Date() })
      .returning();
    return newEvent;
  }

  // People
  async getPeople(page = 1, limit = 50): Promise<{ people: Person[], total: number }> {
    const offset = (page - 1) * limit;
    const people_results = await db
      .select()
      .from(people)
      .limit(limit)
      .offset(offset)
      .orderBy(people.name);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(people);

    return {
      people: people_results,
      total: Number(count)
    };
  }

  async getPersonByApiId(apiId: string): Promise<Person | undefined> {
    const [person] = await db.select().from(people).where(eq(people.api_id, apiId));
    return person;
  }

  async getPersonByEmail(email: string): Promise<Person | undefined> {
    const [person] = await db.select().from(people).where(eq(people.email, email));
    return person;
  }

  async upsertPerson(person: InsertPerson): Promise<Person> {
    // Try to find existing person
    const existing = await this.getPersonByApiId(person.api_id);

    if (existing) {
      const [updated] = await db
        .update(people)
        .set({ ...person, last_synced_at: new Date() })
        .where(eq(people.id, existing.id))
        .returning();
      return updated;
    }

    // Insert new person
    const [newPerson] = await db
      .insert(people)
      .values({ ...person, last_synced_at: new Date() })
      .returning();
    return newPerson;
  }

  // Auth
  async createAuthUser(user: InsertAuthUser): Promise<AuthUser> {
    const [newUser] = await db
      .insert(auth_users)
      .values(user)
      .returning();
    return newUser;
  }

  async getAuthUserByEmail(email: string): Promise<AuthUser | undefined> {
    const [user] = await db
      .select()
      .from(auth_users)
      .where(eq(auth_users.email, email));
    return user;
  }
}

export const storage = new DatabaseStorage();