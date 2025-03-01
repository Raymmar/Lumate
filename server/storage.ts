import { 
  Event, InsertEvent, 
  Person, InsertPerson, 
  User, InsertUser,
  VerificationToken, InsertVerificationToken,
  events, people, cacheMetadata, eventRsvpStatus, attendance,
  InsertCacheMetadata, users, verificationTokens,
  EventRsvpStatus, InsertEventRsvpStatus,
  Attendance, InsertAttendance
} from "@shared/schema";
import { db } from "./db";
import { sql, eq, and, or } from "drizzle-orm";
import crypto from "crypto";

export interface IStorage {
  // Events
  getEvents(): Promise<Event[]>;
  getEventCount(): Promise<number>;
  getEventsByEndTimeRange(startDate: Date, endDate: Date): Promise<Event[]>; 
  insertEvent(event: InsertEvent): Promise<Event>;
  getRecentlyEndedEvents(): Promise<Event[]>; 
  clearEvents(): Promise<void>;

  // People
  getPeople(): Promise<Person[]>;
  getPeopleCount(): Promise<number>;
  getPerson(id: number): Promise<Person | null>; 
  getPersonByEmail(email: string): Promise<Person | null>; 
  getPersonByApiId(apiId: string): Promise<Person | null>;
  insertPerson(person: InsertPerson): Promise<Person>;
  clearPeople(): Promise<void>;

  // Cache metadata
  getLastCacheUpdate(): Promise<Date | null>;
  setLastCacheUpdate(date: Date): Promise<void>;

  // User management
  createUser(userData: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: number): Promise<User | null>;
  getUserCount(): Promise<number>; 
  getUserWithPerson(userId: number): Promise<(User & { person: Person }) | null>;
  updateUserPassword(userId: number, hashedPassword: string): Promise<User>;
  verifyUser(userId: number): Promise<User>;

  // Email verification
  createVerificationToken(email: string): Promise<VerificationToken>;
  validateVerificationToken(token: string): Promise<VerificationToken | null>;
  deleteVerificationToken(token: string): Promise<void>;
  deleteVerificationTokensByEmail(email: string): Promise<void>;

  // RSVP status
  getRsvpStatus(userApiId: string, eventApiId: string): Promise<EventRsvpStatus | null>;
  upsertRsvpStatus(status: InsertEventRsvpStatus): Promise<EventRsvpStatus>;

  // Attendance
  getAttendanceByEvent(eventApiId: string): Promise<Attendance[]>;
  upsertAttendance(attendance: InsertAttendance): Promise<Attendance>;
  getAttendanceByEmail(email: string): Promise<Attendance[]>;
  deleteAttendanceByEvent(eventApiId: string): Promise<void>; 
  updateEventAttendanceSync(eventApiId: string): Promise<Event>;
  getEventAttendanceStatus(eventApiId: string): Promise<{ 
    hasAttendees: boolean;
    lastSyncTime: string | null;
  }>;
  getTotalAttendeesCount(): Promise<number>;

  // Attendance stats
  updatePersonStats(personId: number): Promise<Person>;
  getTopAttendees(limit?: number): Promise<Person[]>;
  getFeaturedEvent(): Promise<Event | null>;
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
        .values({
          ...person,
          stats: person.stats || {
            totalEventsAttended: 0,
            lastEventDate: null,
            firstEventDate: null,
            lastUpdated: new Date().toISOString()
          }
        })
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
          email: userData.email.toLowerCase(), 
          personId: person.id,
          isVerified: false, 
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
  async getUserCount(): Promise<number> {
    const result = await db.select({ count: sql`COUNT(*)` }).from(users);
    const count = Number(result[0].count);
    return count;
  }

  async getRsvpStatus(userApiId: string, eventApiId: string): Promise<EventRsvpStatus | null> {
    try {
      const result = await db
        .select()
        .from(eventRsvpStatus)
        .where(and(
          eq(eventRsvpStatus.userApiId, userApiId),
          eq(eventRsvpStatus.eventApiId, eventApiId)
        ))
        .limit(1);

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Failed to get RSVP status:', error);
      throw error;
    }
  }

  async upsertRsvpStatus(status: InsertEventRsvpStatus): Promise<EventRsvpStatus> {
    try {
      const [result] = await db
        .insert(eventRsvpStatus)
        .values(status)
        .onConflictDoUpdate({
          target: [eventRsvpStatus.userApiId, eventRsvpStatus.eventApiId],
          set: {
            status: status.status,
            updatedAt: new Date().toISOString()
          }
        })
        .returning();

      return result;
    } catch (error) {
      console.error('Failed to upsert RSVP status:', error);
      throw error;
    }
  }

  async getAttendanceByEvent(eventApiId: string): Promise<Attendance[]> {
    try {
      const result = await db
        .select()
        .from(attendance)
        .where(eq(attendance.eventApiId, eventApiId))
        .orderBy(attendance.registeredAt);
      return result;
    } catch (error) {
      console.error('Failed to get attendance for event:', error);
      throw error;
    }
  }

  async upsertAttendance(data: InsertAttendance): Promise<Attendance> {
    try {
      console.log('Attempting to upsert attendance record:', {
        eventApiId: data.eventApiId,
        userEmail: data.userEmail,
        guestApiId: data.guestApiId,
        checkedInAt: data.checkedInAt
      });

      // First, try to find matching user and person by email
      const [matchingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, data.userEmail.toLowerCase()))
        .limit(1);

      const [matchingPerson] = await db
        .select()
        .from(people)
        .where(eq(people.email, data.userEmail.toLowerCase()))
        .limit(1);

      console.log('Found matching records:', {
        foundUser: matchingUser ? { id: matchingUser.id, email: matchingUser.email } : null,
        foundPerson: matchingPerson ? { id: matchingPerson.id, email: matchingPerson.email } : null
      });

      const [result] = await db
        .insert(attendance)
        .values({
          ...data,
          userId: matchingUser?.id,
          personId: matchingPerson?.id,
          lastSyncedAt: new Date().toISOString()
        })
        .onConflictDoUpdate({
          target: attendance.guestApiId,
          set: {
            approvalStatus: data.approvalStatus,
            checkedInAt: data.checkedInAt,
            userId: matchingUser?.id,
            personId: matchingPerson?.id,
            lastSyncedAt: new Date().toISOString()
          }
        })
        .returning();

      console.log('Successfully upserted attendance record:', {
        id: result.id,
        guestApiId: result.guestApiId,
        userId: result.userId,
        personId: result.personId,
        checkedInAt: result.checkedInAt
      });

      // After successfully upserting attendance, update the person's stats
      if (result.personId) {
        await this.updatePersonStats(result.personId);
      }

      return result;
    } catch (error) {
      console.error('Failed to upsert attendance:', error);
      throw error;
    }
  }

  async getAttendanceByEmail(email: string): Promise<Attendance[]> {
    try {
      const result = await db
        .select()
        .from(attendance)
        .where(eq(attendance.userEmail, email.toLowerCase()))
        .orderBy(attendance.registeredAt);
      return result;
    } catch (error) {
      console.error('Failed to get attendance by email:', error);
      throw error;
    }
  }
  async deleteAttendanceByEvent(eventApiId: string): Promise<void> {
    try {
      // Modified to only delete records for the specific event
      await db
        .delete(attendance)
        .where(eq(attendance.eventApiId, eventApiId));
      console.log('Successfully deleted attendance records for event:', eventApiId);
    } catch (error) {
      console.error('Failed to delete attendance records:', error);
      throw error;
    }
  }
  async updateEventAttendanceSync(eventApiId: string): Promise<Event> {
    try {
      const [updatedEvent] = await db
        .update(events)
        .set({
          lastAttendanceSync: new Date().toISOString()
        })
        .where(eq(events.api_id, eventApiId))
        .returning();

      if (!updatedEvent) {
        throw new Error(`Event with API ID ${eventApiId} not found`);
      }

      return updatedEvent;
    } catch (error) {
      console.error('Failed to update event attendance sync timestamp:', error);
      throw error;
    }
  }
  async getRecentlyEndedEvents(): Promise<Event[]> {
    try {
      // Find events that ended in the last hour and haven't been synced
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const result = await db
        .select()
        .from(events)
        .where(
          and(
            sql`end_time <= ${new Date().toISOString()}`,
            sql`end_time > ${oneHourAgo.toISOString()}`,
            or(
              sql`last_attendance_sync IS NULL`,
              sql`last_attendance_sync < end_time`
            )
          )
        )
        .orderBy(events.endTime);

      return result;
    } catch (error) {
      console.error('Failed to get recently ended events:', error);
      throw error;
    }
  }

  async getEventsByEndTimeRange(startDate: Date, endDate: Date): Promise<Event[]> {
    try {
      const result = await db
        .select()
        .from(events)
        .where(
          and(
            sql`end_time >= ${startDate.toISOString()}`,
            sql`end_time <= ${endDate.toISOString()}`
          )
        )
        .orderBy(events.endTime);

      return result;
    } catch (error) {
      console.error('Failed to get events by end time range:', error);
      throw error;
    }
  }
  async getEventAttendanceStatus(eventApiId: string): Promise<{ hasAttendees: boolean; lastSyncTime: string | null; }> {
    try {
      // Check if there are any attendees for this event
      const result = await db
        .select({
          count: sql<number>`COUNT(*)`,
          lastSync: sql<string | null>`MAX(last_synced_at)`
        })
        .from(attendance)
        .where(eq(attendance.eventApiId, eventApiId))
        .limit(1);

      return {
        hasAttendees: Number(result[0].count) > 0,
        lastSyncTime: result[0].lastSync
      };
    } catch (error) {
      console.error('Failed to get event attendance status:', error);
      return {
        hasAttendees: false,
        lastSyncTime: null
      };
    }
  }
  async getTotalAttendeesCount(): Promise<number> {
    try {
      const result = await db
        .select({ count: sql`COUNT(*)` })
        .from(attendance);
      return Number(result[0].count);
    } catch (error) {
      console.error('Failed to get total attendees count:', error);
      throw error;
    }
  }

  async updatePersonStats(personId: number): Promise<Person> {
    try {
      // Get all attendance records for this person
      const attendanceRecords = await db
        .select({
          registeredAt: attendance.registeredAt,
          checkedInAt: attendance.checkedInAt
        })
        .from(attendance)
        .where(eq(attendance.personId, personId))
        .orderBy(attendance.registeredAt);

      const stats: Record<string, any> = {
        totalEventsAttended: attendanceRecords.length,
        totalCheckins: attendanceRecords.filter(record => record.checkedInAt !== null).length,
        firstEventDate: attendanceRecords[0]?.registeredAt || null,
        lastEventDate: attendanceRecords[attendanceRecords.length - 1]?.registeredAt || null,
        lastUpdated: new Date().toISOString()
      };

      // Calculate average events per year if we have attendance
      if (stats.firstEventDate && stats.lastEventDate) {
        const firstDate = new Date(stats.firstEventDate);
        const lastDate = new Date(stats.lastEventDate);
        const yearsDiff = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        if (yearsDiff > 0) {
          stats.averageEventsPerYear = stats.totalEventsAttended / yearsDiff;
        } else {
          stats.averageEventsPerYear = stats.totalEventsAttended * (365.25 / ((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)));
        }
      }

      // Update the person's stats
      const [updatedPerson] = await db
        .update(people)
        .set({ stats })
        .where(eq(people.id, personId))
        .returning();

      if (!updatedPerson) {
        throw new Error(`Person with ID ${personId} not found`);
      }

      return updatedPerson;
    } catch (error) {
      console.error('Failed to update person stats:', error);
      throw error;
    }
  }

  async getTopAttendees(limit: number = 10): Promise<Person[]> {
    try {
      // Order by total events attended first, then by most recent event
      const result = await db
        .select()
        .from(people)
        .where(sql`stats->>'totalEventsAttended' IS NOT NULL`)
        .orderBy(
          sql`(stats->>'totalEventsAttended')::int DESC`,
          sql`(stats->>'lastEventDate')::timestamptz DESC NULLS LAST`
        )
        .limit(limit);

      return result;
    } catch (error) {
      console.error('Failed to get top attendees:', error);
      throw error;
    }
  }

  async getFeaturedEvent(): Promise<Event | null> {
    try {
      // Get the most recent upcoming event
      const result = await db
        .select()
        .from(events)
        .where(sql`end_time > NOW()`)
        .orderBy(events.startTime)
        .limit(1);

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Failed to get featured event:', error);
      throw error;
    }
  }
}

export const storage = new PostgresStorage();