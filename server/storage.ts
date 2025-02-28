import { 
  Event, InsertEvent, 
  Person, InsertPerson, 
  User, InsertUser,
  VerificationToken, InsertVerificationToken,
  events, people, cacheMetadata, 
  InsertCacheMetadata, users, verificationTokens 
} from "@shared/schema";
import { db } from "./db";
import { sql, eq, and } from "drizzle-orm";
import crypto from "crypto";

export interface IStorage {
  // Events
  getEvents(): Promise<Event[]>;
  getEventCount(): Promise<number>;
  insertEvent(event: InsertEvent): Promise<Event>;
  clearEvents(): Promise<void>;
  
  // People
  getPeople(): Promise<Person[]>;
  getPeopleCount(): Promise<number>;
  getPersonById(id: number): Promise<Person | null>;
  getPersonByEmail(email: string): Promise<Person | null>; 
  insertPerson(person: InsertPerson): Promise<Person>;
  clearPeople(): Promise<void>;
  getPerson(id: number): Promise<Person | null>; // Added getPerson method
  
  // Cache metadata
  getLastCacheUpdate(): Promise<Date | null>;
  setLastCacheUpdate(date: Date): Promise<void>;
  
  // User management
  createUser(userData: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: number): Promise<User | null>;
  getUserWithPerson(userId: number): Promise<(User & { person: Person }) | null>;
  verifyUser(userId: number): Promise<User>;
  getUser(id: number): Promise<User | null>;  
  
  // Email verification
  createVerificationToken(email: string): Promise<VerificationToken>;
  validateVerificationToken(token: string): Promise<VerificationToken | null>;
  deleteVerificationToken(token: string): Promise<void>;
  // Add new method for getting person by API ID
  getPersonByApiId(apiId: string): Promise<Person | null>;
  // Add new methods for password management
  updateUserPassword(userId: number, hashedPassword: string): Promise<User>;
  // Add new method for deleting verification tokens by email
  deleteVerificationTokensByEmail(email: string): Promise<void>;
}

export class PostgresStorage implements IStorage {
  async getEvents(): Promise<Event[]> {
    console.log('Fetching all events from database...');
    const result = await db.select().from(events);
    console.log(`Found ${result.length} events in database`);
    return result;
  }
  
  async getEventCount(): Promise<number> {
    const result = await db.select({ count: sql`COUNT(*)` }).from(events);
    const count = Number(result[0].count);
    return count;
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
    console.log('Clearing events table...');
    try {
      await db.transaction(async (tx) => {
        await tx.delete(events);
        await tx.execute(sql`ALTER SEQUENCE events_id_seq RESTART WITH 1`);
        console.log('Successfully cleared events and reset ID sequence');
      });
    } catch (error) {
      console.error('Failed to clear events table:', error);
      throw error;
    }
  }
  
  async getPeople(): Promise<Person[]> {
    console.log('Fetching all people from database...');
    const result = await db.select().from(people);
    console.log(`Found ${result.length} people in database`);
    return result;
  }
  
  async getPeopleCount(): Promise<number> {
    const result = await db.select({ count: sql`COUNT(*)` }).from(people);
    const count = Number(result[0].count);
    return count;
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
    console.log('Clearing people table while preserving user relationships...');
    try {
      await db.transaction(async (tx) => {
        // Get all users' emails to preserve relationships
        const userEmails = await tx
          .select({ email: users.email })
          .from(users);
        
        console.log(`Found ${userEmails.length} user emails to preserve`);
        
        // First set person_id to NULL for all users to avoid constraint violations
        await tx.execute(sql`UPDATE users SET person_id = NULL`);
        console.log('Temporarily unlinked users from people records');
        
        // Now safe to clear people table
        await tx.delete(people);
        console.log('Cleared people table');
        
        // Reset the sequence
        await tx.execute(sql`ALTER SEQUENCE people_id_seq RESTART WITH 1`);
        console.log('Reset people table ID sequence');
        
        console.log('Successfully cleared people table while preserving user table');
      });
    } catch (error) {
      console.error('Failed to clear people table:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack
        });
      }
      throw error;
    }
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
  
  // People methods
  async getPersonById(id: number): Promise<Person | null> {
    try {
      const result = await db
        .select()
        .from(people)
        .where(eq(people.id, id))
        .limit(1);
      
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Failed to get person by ID:', error);
      throw error;
    }
  }
  
  async getPersonByEmail(email: string): Promise<Person | null> {
    try {
      const result = await db
        .select()
        .from(people)
        .where(eq(people.email, email))
        .limit(1);
      
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Failed to get person by email:', error);
      throw error;
    }
  }
  
  // User management methods
  async createUser(userData: InsertUser): Promise<User> {
    try {
      console.log('Creating new user with email:', userData.email);
      
      // First get the person by email to ensure we have the latest data
      const person = await this.getPersonByEmail(userData.email);
      
      if (!person) {
        throw new Error(`No matching person found for email: ${userData.email}`);
      }
      
      const [newUser] = await db
        .insert(users)
        .values({
          ...userData,
          email: userData.email.toLowerCase(), // Ensure consistent email format
          personId: person.id,
          isVerified: false, // Always start as unverified
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .returning();
      
      console.log('Successfully created user:', newUser.id, 'linked to person:', person.id);
      return newUser;
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  }
  
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Failed to get user by email:', error);
      throw error;
    }
  }
  
  async getUserById(id: number): Promise<User | null> {
    try {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Failed to get user by ID:', error);
      throw error;
    }
  }
  
  async getUserWithPerson(userId: number): Promise<(User & { person: Person }) | null> {
    try {
      const user = await this.getUserById(userId);
      if (!user) return null;
      
      // Get the person by email instead of ID
      const person = await this.getPersonByEmail(user.email);
      if (!person) return null;
      
      return {
        ...user,
        person
      };
    } catch (error) {
      console.error('Failed to get user with person details:', error);
      throw error;
    }
  }
  
  async verifyUser(userId: number): Promise<User> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({ 
          isVerified: true,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, userId))
        .returning();
      
      if (!updatedUser) {
        throw new Error(`User with ID ${userId} not found`);
      }
      
      return updatedUser;
    } catch (error) {
      console.error('Failed to verify user:', error);
      throw error;
    }
  }
  
  // Email verification methods
  async createVerificationToken(email: string): Promise<VerificationToken> {
    try {
      console.log('Creating verification token for email:', email);
      // Generate a secure random token
      const token = crypto.randomBytes(32).toString('hex');
      
      // Set expiration to 24 hours from now
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      const [newToken] = await db
        .insert(verificationTokens)
        .values({
          token,
          email,
          expiresAt: expiresAt.toISOString(),
        })
        .returning();
      
      console.log('Successfully created verification token:', {
        email,
        tokenId: newToken.id,
        expiresAt: newToken.expiresAt
      });
      
      return newToken;
    } catch (error) {
      console.error('Failed to create verification token:', error);
      throw error;
    }
  }
  
  async validateVerificationToken(token: string): Promise<VerificationToken | null> {
    try {
      const result = await db
        .select()
        .from(verificationTokens)
        .where(eq(verificationTokens.token, token))
        .limit(1);
      
      if (result.length === 0) {
        return null;
      }
      
      const verificationToken = result[0];
      const now = new Date();
      const expiresAt = new Date(verificationToken.expiresAt);
      
      // Check if token is expired
      if (now > expiresAt) {
        await this.deleteVerificationToken(token);
        return null;
      }
      
      return verificationToken;
    } catch (error) {
      console.error('Failed to validate verification token:', error);
      throw error;
    }
  }
  
  async deleteVerificationToken(token: string): Promise<void> {
    try {
      await db
        .delete(verificationTokens)
        .where(eq(verificationTokens.token, token));
    } catch (error) {
      console.error('Failed to delete verification token:', error);
      throw error;
    }
  }
  async getPersonByApiId(apiId: string): Promise<Person | null> {
    try {
      const result = await db
        .select()
        .from(people)
        .where(eq(people.api_id, apiId))
        .limit(1);
      
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Failed to get person by API ID:', error);
      throw error;
    }
  }
  async updateUserPassword(userId: number, hashedPassword: string): Promise<User> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({ 
          password: hashedPassword,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, userId))
        .returning();
    
      if (!updatedUser) {
        throw new Error(`User with ID ${userId} not found`);
      }
    
      return updatedUser;
    } catch (error) {
      console.error('Failed to update user password:', error);
      throw error;
    }
  }
  async deleteVerificationTokensByEmail(email: string): Promise<void> {
    try {
      await db
        .delete(verificationTokens)
        .where(eq(verificationTokens.email, email.toLowerCase()));
    } catch (error) {
      console.error('Failed to delete verification tokens for email:', email, error);
      throw error;
    }
  }
  async getUser(id: number): Promise<User | null> {
    try {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Failed to get user:', error);
      throw error;
    }
  }
  async getPerson(id: number): Promise<Person | null> {
    try {
      const result = await db
        .select()
        .from(people)
        .where(eq(people.id, id))
        .limit(1);

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Failed to get person:', error);
      throw error;
    }
  }
}

export const storage = new PostgresStorage();