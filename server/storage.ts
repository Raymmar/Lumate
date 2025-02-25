import { and, eq, ilike, or, sql } from "drizzle-orm";
import { people, users, type Person, type InsertPerson, type PersonWithUser } from "@shared/schema";
import { db } from "./db";

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface IStorage {
  getPeople(page: number, limit: number, search?: string): Promise<PaginatedResult<PersonWithUser>>;
  insertPerson(person: InsertPerson): Promise<Person>;
}

export class DatabaseStorage implements IStorage {
  async getPeople(
    page: number = 1,
    limit: number = 30,
    search?: string
  ): Promise<PaginatedResult<PersonWithUser>> {
    const offset = (page - 1) * limit;

    // Build the base query conditions
    const conditions = [];
    if (search) {
      conditions.push(
        or(
          ilike(people.email, `%${search}%`),
          ilike(users.name, `%${search}%`)
        )
      );
    }

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(people)
      .leftJoin(users, eq(people.userId, users.id))
      .where(and(...conditions));

    // Get paginated results with user data
    const items = await db
      .select()
      .from(people)
      .leftJoin(users, eq(people.userId, users.id))
      .where(and(...conditions))
      .limit(limit)
      .offset(offset)
      .orderBy(people.createdAt);

    // Transform the results to match the expected format
    const transformedItems = items.map(({ people: person, users: user }) => ({
      ...person,
      user: user || null,
    }));

    return {
      items: transformedItems,
      total: Number(count),
      page,
      limit,
      hasMore: offset + items.length < Number(count),
    };
  }

  async insertPerson(person: InsertPerson): Promise<Person> {
    const [newPerson] = await db.insert(people).values(person).returning();
    return newPerson;
  }
}

export const storage = new DatabaseStorage();