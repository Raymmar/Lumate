import { 
  Event, InsertEvent, 
  Person, InsertPerson, 
  User, InsertUser,
  Role, InsertRole,
  Permission, InsertPermission,
  UserRole, InsertUserRole,
  RolePermission, InsertRolePermission,
  Post, InsertPost,
  Tag, InsertTag,
  PostTag, InsertPostTag,
  VerificationToken, InsertVerificationToken,
  EventRsvpStatus, InsertEventRsvpStatus,
  Attendance, InsertAttendance,
  CacheMetadata, InsertCacheMetadata,
  Badge,
  Company, InsertCompany,
  CompanyMember, InsertCompanyMember,
  CompanyTag, InsertCompanyTag,
  events, people, users, roles, permissions, userRoles, rolePermissions,
  posts, tags, postTags, verificationTokens, eventRsvpStatus, attendance, cacheMetadata,
  badges, userBadges as userBadgesTable, companies, companyMembers, companyTags
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
  getEventByApiId(apiId: string): Promise<Event | null>; 
  getFutureEvents(): Promise<Event[]>; 

  // People
  getPeople(): Promise<Person[]>;
  getPeopleCount(): Promise<number>;
  getPerson(id: number): Promise<Person | null>; 
  getPersonByEmail(email: string): Promise<Person | null>; 
  getPersonByApiId(apiId: string): Promise<Person | null>;
  insertPerson(person: InsertPerson): Promise<Person>;
  clearPeople(): Promise<void>;
  getFeaturedMember(): Promise<(Person & { user?: User & { badges?: Array<Badge> } }) | null>;
  setFeaturedMember(personId: number): Promise<void>;

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
  updateUserAdminStatus(userId: number, isAdmin: boolean): Promise<User>;
  updateUser(userId: number, data: Partial<User>): Promise<User>;

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

  // Posts and Tags
  getPosts(): Promise<Post[]>;
  createPost(post: InsertPost): Promise<Post>;
  getTags(): Promise<Tag[]>;
  createTag(tag: InsertTag): Promise<Tag>;
  getPostTags(postId: number): Promise<Tag[]>;
  addTagToPost(postTag: InsertPostTag): Promise<PostTag>;

  // Role management
  createRole(role: InsertRole): Promise<Role>;
  getRoleById(id: number): Promise<Role | null>;
  getRoleByName(name: string): Promise<Role | null>;
  getAllRoles(): Promise<Role[]>;

  // Permission management
  createPermission(permission: InsertPermission): Promise<Permission>;
  getPermissionById(id: number): Promise<Permission | null>;
  getPermissionsByResource(resource: string): Promise<Permission[]>;
  getAllPermissions(): Promise<Permission[]>;

  // User role management
  assignRoleToUser(userId: number, roleId: number, grantedBy: number): Promise<UserRole>;
  removeRoleFromUser(userId: number, roleId: number): Promise<void>;
  getUserRoles(userId: number): Promise<Role[]>;

  // Role permission management
  assignPermissionToRole(roleId: number, permissionId: number, grantedBy: number): Promise<RolePermission>;
  removePermissionFromRole(roleId: number, permissionId: number): Promise<void>;
  getRolePermissions(roleId: number): Promise<Permission[]>;

  // Enhanced user methods
  getUserWithRoles(userId: number): Promise<(User & { roles: Role[], permissions: Permission[] }) | null>;
  hasPermission(userId: number, resource: string, action: string): Promise<boolean>;
  getTopAttendees(limit?: number): Promise<Person[]>;
  getFeaturedEvent(): Promise<Event | null>;
  clearEventAttendance(eventApiId: string): Promise<Event>;

  // Stripe-related methods
  getUserByStripeCustomerId(customerId: string): Promise<User | null>;
  updateUserSubscription(userId: number, subscriptionId: string, status: string): Promise<User>;
  setStripeCustomerId(userId: number, customerId: string): Promise<User>;
  getPersonByUsername(username: string): Promise<Person | null>;
  getPaidUsersCount(): Promise<number>;

  // Add this new method
  updatePost(postId: number, data: Partial<Post>): Promise<Post>;

  // Password reset
  createPasswordResetToken(email: string, token: string): Promise<VerificationToken>;
  validatePasswordResetToken(token: string): Promise<VerificationToken | null>;
  deletePasswordResetToken(token: string): Promise<void>;
  deletePasswordResetTokensByEmail(email: string): Promise<void>;

  // Company management
  getCompanies(): Promise<Company[]>;
  getCompanyById(id: number): Promise<Company | null>;
  createCompany(companyData: InsertCompany): Promise<Company>;
  updateCompany(companyId: number, data: Partial<Company>): Promise<Company>;
  deleteCompany(companyId: number): Promise<void>;
  
  // Company members management
  getCompanyMembers(companyId: number): Promise<(CompanyMember & { user: User })[]>;
  addMemberToCompany(companyMembership: InsertCompanyMember): Promise<CompanyMember>;
  updateCompanyMemberRole(companyId: number, userId: number, role: string): Promise<CompanyMember>;
  removeCompanyMember(companyId: number, userId: number): Promise<void>;
  getUserCompanies(userId: number): Promise<(Company & { role: string })[]>;
  isCompanyAdmin(userId: number, companyId: number): Promise<boolean>;
  
  // Check if a user is a member of a company (any role)
  isCompanyMember(userId: number, companyId: number): Promise<boolean>;
  
  // Company tags management
  getCompanyTags(companyId: number): Promise<Tag[]>;
  addTagToCompany(companyTag: InsertCompanyTag): Promise<CompanyTag>;

  // Batch invite functionality
  getUnclaimedPeople(): Promise<Person[]>;
}

export class PostgresStorage implements IStorage {
  async getEvents(): Promise<Event[]> {
    console.log('Fetching public events from database...');
    const result = await db.select().from(events).where(sql`visibility != 'private' OR visibility IS NULL`);
    console.log(`Found ${result.length} public events in database`);
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
        .select({
          ...people,
          isAdmin: users.isAdmin
        })
        .from(people)
        .leftJoin(users, eq(users.email, people.email))
        .where(eq(people.api_id, apiId))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      // Extract the person data and admin status
      const person = result[0];
      return {
        ...person,
        isAdmin: Boolean(person.isAdmin)
      };
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
  async getUserCount(): Promise<number> {
    const result = await db.select({ count: sql`COUNT(*)` }).from(users);
    const count = Number(result[0].count);
    return count;
  }
  
  async getPaidUsersCount(): Promise<number> {
    try {
      const result = await db
        .select({ count: sql`COUNT(*)` })
        .from(users)
        .where(eq(users.subscriptionStatus, 'active'));
      
      const count = Number(result[0].count);
      return count;
    } catch (error) {
      console.error('Failed to get paid users count:', error);
      return 0;
    }
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
        guestApiId: data.guestApiId
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
        personId: result.personId
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
      // First get all affected persons before deleting
      const affectedPersons = await db
        .select({ personId: attendance.personId })
        .from(attendance)
        .where(eq(attendance.eventApiId, eventApiId))
        .groupBy(attendance.personId);

      console.log(`Found ${affectedPersons.length} persons affected by attendance deletion`);

      // Delete the attendance records
      await db
        .delete(attendance)
        .where(eq(attendance.eventApiId, eventApiId));

      console.log('Successfully deleted attendance records for event:', eventApiId);

      // Update stats for all affected persons
      for (const { personId } of affectedPersons) {
        if (personId) {
          await this.updatePersonStats(personId);
        }
      }

      console.log('Successfully updated stats for all affected persons');
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
      // Find events that ended in the last hour and haven't been synced (but include private events for sync purposes)
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
      console.log('Updating stats for person:', personId);

      // Get all attendance records and count them directly
      const result = await db.execute(sql`
        WITH event_stats AS (
          SELECT 
            COUNT(*) as event_count,
            MIN(registered_at::text) as first_event,
            MAX(registered_at::text) as last_event
          FROM attendance 
          WHERE person_id = ${personId}
            AND approval_status = 'approved'
        )
        UPDATE people 
        SET stats = jsonb_build_object(
          'totalEventsAttended', (SELECT event_count FROM event_stats),
          'firstEventDate', (SELECT first_event FROM event_stats),
          'lastEventDate', (SELECT last_event FROM event_stats),
          'lastUpdated', ${new Date().toISOString()}::text
        )
        WHERE id = ${personId}
        RETURNING *
      `);

      const updatedPerson = result.rows[0] as Person;
      if (!updatedPerson) {
        throw new Error(`Person with ID ${personId} not found`);
      }

      console.log('Successfully updated person stats:', {
        personId,
        stats: updatedPerson.stats
      });

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
      // Get the most recent upcoming public event
      const result = await db
        .select()
        .from(events)
        .where(sql`end_time > NOW() AND (visibility != 'private' OR visibility IS NULL)`)
        .orderBy(events.startTime)
        .limit(1);

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Failed to get featured event:', error);
      throw error;
    }
  }

  async getFeaturedMember(): Promise<(Person & { user?: User & { badges?: Array<Badge> } }) | null> {
    try {
      const FEATURED_MEMBER_KEY = 'featured_member';
      const EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      
      // Check if we have a cached featured member
      const cachedData = await db
        .select()
        .from(cacheMetadata)
        .where(eq(cacheMetadata.key, FEATURED_MEMBER_KEY))
        .limit(1);
      
      let personId: number | null = null;
      
      if (cachedData.length > 0) {
        const cachedMember = JSON.parse(cachedData[0].value);
        const updatedAt = new Date(cachedData[0].updatedAt);
        const now = new Date();
        
        // Check if the cached member is still valid (less than 24 hours old)
        if (now.getTime() - updatedAt.getTime() < EXPIRATION_TIME) {
          // Verify if the cached member still has a verified user account
          const verifiedUser = await db
            .select({ count: sql<number>`count(*)` })
            .from(people)
            .innerJoin(users, eq(users.email, people.email))
            .where(and(
              eq(people.id, cachedMember.personId),
              eq(users.isVerified, true)
            ));
          
          if (verifiedUser[0].count > 0) {
            personId = cachedMember.personId;
            console.log('Using cached featured member:', personId);
          } else {
            console.log('Cached featured member is no longer verified, selecting new one');
          }
        }
      }
      
      // If we don't have a valid cached member, select a random one from verified attendees with at least 10 events
      if (!personId) {
        // First try to get only verified attendees with 10+ events
        const query = db
          .select({
            id: people.id,
            email: people.email
          })
          .from(people)
          .innerJoin(users, eq(users.email, people.email))
          .where(and(
            sql`(stats->>'totalEventsAttended')::int >= 10`,
            eq(users.isVerified, true)
          ))
          .orderBy(sql`RANDOM()`)
          .limit(10);
        
        let eligibleMembers = await query;
        
        // If we don't have any with 10+ events, fall back to verified top attendees
        if (eligibleMembers.length === 0) {
          console.log('No verified members with 10+ events found, falling back to verified top attendees');
          const allTopAttendees = await this.getTopAttendees(20); // Get more to filter

          // Filter to only verified members
          const verifiedTopAttendees = [];
          for (const attendee of allTopAttendees) {
            const verifiedCheck = await db
              .select({ count: sql<number>`count(*)` })
              .from(users)
              .where(and(
                eq(users.email, attendee.email),
                eq(users.isVerified, true)
              ));
              
            if (verifiedCheck[0].count > 0) {
              verifiedTopAttendees.push(attendee);
              if (verifiedTopAttendees.length >= 10) break; // Stop once we have enough
            }
          }
          
          if (verifiedTopAttendees.length === 0) {
            return null;
          }
          
          eligibleMembers = verifiedTopAttendees;
          console.log(`Found ${eligibleMembers.length} verified top attendees`);
        } else {
          console.log(`Found ${eligibleMembers.length} verified members with 10+ events`);
        }
        
        // Select a random member from the eligible pool
        const randomIndex = Math.floor(Math.random() * eligibleMembers.length);
        personId = eligibleMembers[randomIndex].id;
        
        // Cache this featured member
        await this.setFeaturedMember(personId);
      }
      
      // Get the complete person data with user and badges
      const personData = await db
        .select({
          ...people,
          user: {
            id: users.id,
            email: users.email,
            displayName: users.displayName,
            bio: users.bio,
            isAdmin: users.isAdmin
          }
        })
        .from(people)
        .leftJoin(users, eq(users.email, people.email))
        .where(eq(people.id, personId))
        .limit(1);
      
      if (personData.length === 0) {
        return null;
      }
      
      // Get user badges if there's a user
      let featuredMember = personData[0];
      if (featuredMember.user && featuredMember.user.id) {
        const userBadges = await db
          .select({
            id: badges.id,
            name: badges.name,
            description: badges.description,
            icon: badges.icon,
            isAutomatic: badges.isAutomatic
          })
          .from(userBadgesTable)
          .leftJoin(badges, eq(badges.id, userBadgesTable.badgeId))
          .where(eq(userBadgesTable.userId, featuredMember.user.id));
        
        featuredMember = {
          ...featuredMember,
          user: {
            ...featuredMember.user,
            badges: userBadges
          }
        };
      }
      
      return featuredMember;
    } catch (error) {
      console.error('Failed to get featured member:', error);
      return null;
    }
  }
  
  async setFeaturedMember(personId: number): Promise<void> {
    try {
      const FEATURED_MEMBER_KEY = 'featured_member';
      
      // Store the person ID in the cache
      await db
        .insert(cacheMetadata)
        .values({
          key: FEATURED_MEMBER_KEY,
          value: JSON.stringify({ personId }),
        })
        .onConflictDoUpdate({
          target: cacheMetadata.key,
          set: {
            value: JSON.stringify({ personId }),
            updatedAt: new Date().toISOString(),
          }
        });
      
      console.log('Successfully set featured member:', personId);
    } catch (error) {
      console.error('Failed to set featured member:', error);
      throw error;
    }
  }

  async getPosts(): Promise<Post[]> {
    console.log('Fetching all posts from database...');
    try {
      // Get posts with both creators and tags
      const result = await db
        .select({
          id: posts.id,
          title: posts.title,
          summary: posts.summary,
          body: posts.body,featuredImage: posts.featuredImage,
          videoUrl: posts.videoUrl,          ctaLink: posts.ctaLink,
          ctaLabel: posts.ctaLabel,
          isPinned: posts.isPinned,
          creatorId: posts.creatorId,
          createdAt: posts.createdAt,
          updatedAt: posts.updatedAt,
          creator_id: users.id,
          creator_display_name: users.displayName,
          tag_text: tags.text
                })
        .from(posts)
        .leftJoin(users, eq(posts.creatorId, users.id))
        .leftJoin(postTags, eq(posts.id, postTags.postId))
        .leftJoin(tags, eq(postTags.tagId, tags.id))
        .orderBy(posts.createdAt);

      // Group posts with their tags and creators
      const groupedPosts = result.reduce((acc: any[], row) => {
        const existingPost = acc.find(p => p.id === row.id);
        if (existingPost) {
          if (row.tag_text) {
            existingPost.tags = [...new Set([...existingPost.tags, row.tag_text])];
          }
        } else {
          acc.push({
            id: row.id,
            title: row.title,
            summary: row.summary,
            body: row.body,
            featuredImage: row.featuredImage,
            videoUrl: row.videoUrl,
            ctaLink: row.ctaLink,
            ctaLabel: row.ctaLabel,
            isPinned: row.isPinned,
            creatorId: row.creatorId,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            creator: row.creator_id ? {
              id: row.creator_id,
              displayName: row.creator_display_name
            } : undefined,
            tags: row.tag_text ? [row.tag_text] : []
          });
        }
        return acc;
      }, []);

      console.log('Posts with creators and tags:', groupedPosts.map(p => ({
        id: p.id,
        title: p.title,
        creatorId: p.creatorId,
        creator: p.creator,
        tags: p.tags
      })));

      return groupedPosts;
    } catch (error) {
      console.error('Error fetching posts:', error);
      throw error;
    }
  }

  async createPost(post: InsertPost): Promise<Post> {
    try {
      console.log('Creating new post:', post.title);

      const [newPost] = await db
        .insert(posts)
        .values({
          ...post,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .returning();

      console.log('Successfully created post:', newPost.id);
      return newPost;
    } catch (error) {
      console.error('Failed to create post:', error);
      throw error;
    }
  }
  // Add the new implementation
  async updateUserAdminStatus(userId: number, isAdmin: boolean): Promise<User> {    try {
      console.log('Updating user admin status:', { userId, isAdmin });

            const [updatedUser] = await db
        .update(users)
        .set({ 
          isAdmin,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        throw new Error(`User with ID ${userId} not found`);
      }

      return updatedUser;
    } catch (error) {
      console.error('Failed to update user admin status:', error);
      throw error;
    }
  }
  // Role management methods
  async createRole(role: InsertRole): Promise<Role> {
    try {
      const [newRole] = await db
        .insert(roles)
        .values(role)
        .returning();
      return newRole;
    } catch (error) {
      console.error('Failed to create role:', error);
      throw error;
    }
  }

  async getRoleById(id: number): Promise<Role | null> {
    try {
      const result = await db
        .select()
        .from(roles)
        .where(eq(roles.id, id))
        .limit(1);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Failed to get role by ID:', error);
      throw error;
    }
  }

  async getRoleByName(name: string): Promise<Role | null> {
    try {
      const result = await db
        .select()
        .from(roles)
        .where(eq(roles.name, name))
        .limit(1);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Failed to get role by name:', error);
      throw error;
    }
  }

  async getAllRoles(): Promise<Role[]> {
    try {
      return await db.select().from(roles);
    } catch (error) {
      console.error('Failed to get all roles:', error);
      throw error;
    }
  }

  // Permission management methods
  async createPermission(permission: InsertPermission): Promise<Permission> {
    try {
      const [newPermission] = await db
        .insert(permissions)
        .values(permission)
        .returning();
      return newPermission;
    } catch (error) {
      console.error('Failed to create permission:', error);
      throw error;
    }
  }

  async getPermissionById(id: number): Promise<Permission | null> {
    try {
      const result = await db
        .select()
        .from(permissions)
        .where(eq(permissions.id, id))
        .limit(1);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Failed to get permission by ID:', error);
      throw error;
    }
  }

  async getPermissionsByResource(resource: string): Promise<Permission[]> {
    try {
      return await db
        .select()
        .from(permissions)
        .where(eq(permissions.resource, resource));
    } catch (error) {
      console.error('Failed to get permissions by resource:', error);
      throw error;
    }
  }

  async getAllPermissions(): Promise<Permission[]> {
    try {
      return await db.select().from(permissions);
    } catch (error) {
      console.error('Failed to get all permissions:', error);
      throw error;
    }
  }

  // User role management methods
  async assignRoleToUser(userId: number, roleId: number, grantedBy: number): Promise<UserRole> {
    try {
      const [userRole] = await db
        .insert(userRoles)
        .values({
          userId,
          roleId,
          grantedBy,
        })
        .returning();
      return userRole;
    } catch (error) {
      console.error('Failed to assign role to user:', error);
      throw error;
    }
  }

  async removeRoleFromUser(userId: number, roleId: number): Promise<void> {
    try {
      await db
        .delete(userRoles)
        .where(
          and(
            eq(userRoles.userId, userId),
            eq(userRoles.roleId, roleId)
          )
        );
    } catch (error) {
      console.error('Failed to remove role from user:', error);
      throw error;
    }
  }

  async getUserRoles(userId: number): Promise<Role[]> {
    try {
      return await db
        .select({
          id: roles.id,
          name: roles.name,
          description: roles.description,
          isSystem: roles.isSystem,
          createdAt: roles.createdAt,
          updatedAt: roles.updatedAt,
        })
        .from(userRoles)
        .innerJoin(roles, eq(roles.id, userRoles.roleId))
        .where(eq(userRoles.userId, userId));
    } catch (error) {
      console.error('Failed to get user roles:', error);
      throw error;
    }
  }

  // Role permission management methods
  async assignPermissionToRole(roleId: number, permissionId: number, grantedBy: number): Promise<RolePermission> {
    try {
      const [rolePermission] = await db
        .insert(rolePermissions)
        .values({
          roleId,
          permissionId,
          grantedBy,
        })
        .returning();
      return rolePermission;
    } catch (error) {
      console.error('Failed to assign permission to role:', error);
      throw error;
    }
  }

  async removePermissionFromRole(roleId: number, permissionId: number): Promise<void> {
    try {
      await db
        .delete(rolePermissions)
        .where(
          and(
            eq(rolePermissions.roleId, roleId),
            eq(rolePermissions.permissionId, permissionId)
          )
        );
    } catch (error) {
      console.error('Failed to remove permission from role:', error);
      throw error;
    }
  }

  async getRolePermissions(roleId: number): Promise<Permission[]> {
    try {
      return await db
        .select({
          id: permissions.id,
          name: permissions.name,
          description: permissions.description,
          resource: permissions.resource,
          action: permissions.action,
          createdAt: permissions.createdAt,
        })
        .from(rolePermissions)
        .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
        .where(eq(rolePermissions.roleId, roleId));
    } catch (error) {
      console.error('Failed to get role permissions:', error);
      throw error;
    }
  }

  // Enhanced user methods
  async getUserWithRoles(userId: number): Promise<(User & { roles: Role[], permissions: Permission[] }) | null> {
    try {
      const user = await this.getUserById(userId);
      if (!user) return null;

      const roles = await this.getUserRoles(userId);
      const permissions = await Promise.all(
        roles.map(role => this.getRolePermissions(role.id))
      );

      return {
        ...user,
        roles,
        permissions: permissions.flat(),
      };
    } catch (error) {
      console.error('Failed to get user with roles:', error);
      throw error;
    }
  }

  async hasPermission(userId: number, resource: string, action: string): Promise<boolean> {
    try {
      const roles = await this.getUserRoles(userId);

      // Check if user is admin (maintaining backward compatibility)
      const user = await this.getUserById(userId);
      if (user?.isAdmin) return true;

      // Check role-based permissions
      for (const role of roles) {
        const permissions = await this.getRolePermissions(role.id);
        const hasPermission = permissions.some(
          p => p.resource === resource && p.action === action
        );
        if (hasPermission) return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to check user permission:', error);
      throw error;
    }
  }

  async getTags(): Promise<Tag[]> {
    try {
      return await db.select().from(tags);
    } catch (error) {
      console.error('Failed to get all tags:', error);
      throw error;
    }
  }

  async createTag(tag: InsertTag): Promise<Tag> {
    try {
      const [newTag] = await db
        .insert(tags)
        .values(tag)
        .returning();
      return newTag;
    } catch (error) {
      console.error('Failed to create tag:', error);
      throw error;
    }
  }

  async getPostTags(postId: number): Promise<Tag[]> {
    try {
      return await db
        .select({
          id: tags.id,
          name: tags.name,
          createdAt: tags.createdAt
        })
        .from(postTags)
        .innerJoin(tags, eq(tags.id, postTags.tagId))
        .where(eq(postTags.postId, postId));
    } catch (error) {
      console.error('Failed to get post tags:', error);
      throw error;
    }
  }

  async addTagToPost(postTag: InsertPostTag): Promise<PostTag> {
    try {
      const [newPostTag] = await db
        .insert(postTags)
        .values(postTag)
        .returning();
      return newPostTag;
    } catch (error) {
      console.error('Failed to add tag to post:', error);
      throw error;
    }
  }
  async getEventByApiId(apiId: string): Promise<Event | null> {
    try {
      const result = await db
        .select()
        .from(events)
        .where(eq(events.api_id, apiId))
        .limit(1);

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Failed to get event by API ID:', error);
      throw error;
    }
  }
  async clearEventAttendance(eventApiId: string): Promise<Event> {
    try {
      console.log('Starting to clear attendance for event:', eventApiId);

      // Delete the attendance records
      await db
        .delete(attendance)
        .where(eq(attendance.eventApiId, eventApiId));

      console.log('Successfully deleted attendance records for event:', eventApiId);

      // Update the event's sync status
      const [updatedEvent] = await db
        .update(events)
        .set({
          lastAttendanceSync: null
        })
        .where(eq(events.api_id, eventApiId))
        .returning();

      if (!updatedEvent) {
        throw new Error(`Event with API ID ${eventApiId} not found`);
      }

      console.log('Successfully updated event sync status:', eventApiId);
      return updatedEvent;
    } catch (error) {
      console.error('Failed to clear event attendance:', error);
      throw error;
    }
  }

  async getFutureEvents(): Promise<Event[]> {
    try {
      // Get events that haven't ended yet and are not private
      const result = await db
        .select()
        .from(events)
        .where(sql`end_time > NOW() AND (visibility != 'private' OR visibility IS NULL)`)
        .orderBy(events.startTime);

      return result;
    } catch (error) {
      console.error('Failed to get future events:', error);
      throw error;
    }
  }

  async updateUser(userId: number, data: Partial<User>): Promise<User> {
    try {
      console.log('🔵 Storage: Starting user update operation', {
        userId,
        updateFields: Object.keys(data),
        updateData: JSON.stringify(data, null, 2),
        timestamp: new Date().toISOString()
      });

      // First verify the user exists
      const existingUser = await this.getUser(userId);
      if (!existingUser) {
        console.error('🔴 Storage: Update failed - User not found', {
          userId,
          timestamp: new Date().toISOString()
        });
        throw new Error(`User with ID ${userId} not found`);
      }

      console.log('🟡 Storage: Found existing user', {
        userId: existingUser.id,
        email: existingUser.email,
        currentFields: Object.keys(existingUser),
        currentData: JSON.stringify(existingUser, null, 2)
      });

      // Prepare update data
      const updateData = {
        ...data,
        updatedAt: new Date().toISOString()
      };

      console.log('🟡 Storage: Preparing database update', {
        userId,
        updateFields: Object.keys(updateData),
        updateData: JSON.stringify(updateData, null, 2)
      });

      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        console.error('🔴 Storage: Update failed - No user returned after update', {
          userId,
          updateData: JSON.stringify(updateData, null, 2),
          timestamp: new Date().toISOString()
        });
        throw new Error(`Failed to update user ${userId}`);
      }

      console.log('🟢 Storage: Successfully updated user', {
        userId: updatedUser.id,
        updatedFields: Object.keys(updateData),
        result: JSON.stringify(updatedUser, null, 2),
        timestamp: new Date().toISOString()
      });

      return updatedUser;
    } catch (error) {
      console.error('🔴 Storage: Failed to update user', {
        userId,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        updateData: JSON.stringify(data, null, 2),
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  async getUserByStripeCustomerId(customerId: string): Promise<User | null> {
    try {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.stripeCustomerId, customerId))
        .limit(1);

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Failed to get user by Stripe customer ID:', error);
      throw error;
    }
  }

  async updateUserSubscription(userId: number, subscriptionId: string, status: string): Promise<User> {
    try {
      console.log('📝 Updating user subscription in database:', {
        userId,
        subscriptionId,
        status
      });

      const [updatedUser] = await db
        .update(users)
        .set({
          subscriptionId,
          subscriptionStatus: status,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        throw new Error(`User not found: ${userId}`);
      }

      console.log('✅ Successfully updated user subscription in database:', {
        userId: updatedUser.id,
        subscriptionId: updatedUser.subscriptionId,
        status: updatedUser.subscriptionStatus
      });

      return updatedUser;
    } catch (error) {
      console.error('❌ Failed to update user subscription:', error);
      throw error;
    }
  }

  async setStripeCustomerId(userId: number, customerId: string): Promise<User> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({ 
          stripeCustomerId: customerId,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        throw new Error(`User with ID ${userId} not found`);
      }

      return updatedUser;
    } catch (error) {
      console.error('Failed to set Stripe customer ID:', error);
      throw error;
    }
  }
  async getPersonByUsername(username: string): Promise<Person | null> {
    try {
      // Handle special case for "Dr." in the incoming username
      const searchUsername = username
        .replace(/^dr[\s-]+/i, 'Dr. ') // Convert "dr-" or "dr " prefix back to "Dr. "
        .replace(/-/g, ' '); // Convert remaining hyphens to spaces for lookup

      console.log('Looking up person with processed username:', searchUsername);

      // Get all matching people ordered by creation date (oldest first)
      const result = await db
        .select({
          ...people,
          isAdmin: users.isAdmin
        })
        .from(people)
        .leftJoin(users, eq(users.email, people.email))
        .where(
          or(
            // Try exact match
            eq(people.userName, searchUsername),
            // Try case-insensitive match
            sql`LOWER(user_name) = LOWER(${searchUsername})`,
            // Try with the original hyphenated version
            eq(people.userName, username),
            sql`LOWER(user_name) = LOWER(${username})`
          )
        )
        .orderBy(people.createdAt)
        .limit(1);

      if (result.length === 0) {
        console.log('No person found for username:', searchUsername);
        return null;
      }

      // Extract the person data and admin status
      const person = result[0];
      console.log('Found person:', person.userName);

      return {
        ...person,
        isAdmin: Boolean(person.isAdmin)
      };
    } catch (error) {
      console.error('Failed to get person by username:', error);
      throw error;
    }
  }

  async updatePost(postId: number, data: Partial<Post>): Promise<Post> {
    try {
      console.log('Attempting to update post:', {
        postId,
        updateData: data,
        timestamp: new Date().toISOString()
      });

      const [updatedPost] = await db
        .update(posts)
        .set({
          ...data,
          updatedAt: new Date().toISOString()
        })
        .where(eq(posts.id, postId))
        .returning();

      if (!updatedPost) {
        throw new Error(`Post with ID ${postId} not found`);
      }

      console.log('Successfully updated post:', {
        postId: updatedPost.id,
        title: updatedPost.title,
        updatedAt: updatedPost.updatedAt
      });

      return updatedPost;
    } catch (error) {
      console.error('Failed to update post:', error);
      throw error;
    }
  }
  async createPasswordResetToken(email: string, token: string): Promise<VerificationToken> {
    try {
      console.log('Creating password reset token for email:', email);

      // Set expiration to 24 hours from now
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const [newToken] = await db
        .insert(verificationTokens)
        .values({
          token,
          email: email.toLowerCase(),
          expiresAt: expiresAt.toISOString(),
        })
        .returning();

      console.log('Successfully created password reset token:', {
        email,
        tokenId: newToken.id,
        expiresAt: newToken.expiresAt
      });

      return newToken;
    } catch (error) {
      console.error('Failed to create password reset token:', error);
      throw error;
    }
  }

  async validatePasswordResetToken(token: string): Promise<VerificationToken | null> {
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
        await this.deletePasswordResetToken(token);
        return null;
      }

      return verificationToken;
    } catch (error) {
      console.error('Failed to validate password reset token:', error);
      throw error;
    }
  }

  async deletePasswordResetToken(token: string): Promise<void> {
    try {
      await db
        .delete(verificationTokens)
        .where(eq(verificationTokens.token, token));
    } catch (error) {
      console.error('Failed to delete password reset token:', error);
      throw error;
    }
  }

  async deletePasswordResetTokensByEmail(email: string): Promise<void> {
    try {
      await db
        .delete(verificationTokens)
        .where(eq(verificationTokens.email, email.toLowerCase()));
    } catch (error) {
      console.error('Failed to delete password reset tokens for email:', email, error);
      throw error;
    }
  }

  // Company management methods
  async getCompanies(): Promise<Company[]> {
    try {
      const result = await db.select().from(companies);
      return result;
    } catch (error) {
      console.error('Failed to get companies:', error);
      throw error;
    }
  }

  async getCompanyById(id: number): Promise<Company | null> {
    try {
      const result = await db
        .select()
        .from(companies)
        .where(eq(companies.id, id))
        .limit(1);
      
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Failed to get company by ID:', error);
      throw error;
    }
  }
  
  async getCompanyBySlug(slug: string): Promise<Company | null> {
    try {
      const result = await db
        .select()
        .from(companies)
        .where(eq(companies.slug, slug))
        .limit(1);
      
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Failed to get company by slug:', error);
      throw error;
    }
  }

  async createCompany(companyData: InsertCompany): Promise<Company> {
    try {
      console.log('Creating new company:', companyData.name);
      
      const [newCompany] = await db
        .insert(companies)
        .values({
          ...companyData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .returning();
      
      console.log('Successfully created company:', newCompany.id);
      return newCompany;
    } catch (error) {
      console.error('Failed to create company:', error);
      throw error;
    }
  }

  async updateCompany(companyId: number, data: Partial<Company>): Promise<Company> {
    try {
      const [updatedCompany] = await db
        .update(companies)
        .set({ 
          ...data,
          updatedAt: new Date().toISOString()
        })
        .where(eq(companies.id, companyId))
        .returning();
      
      if (!updatedCompany) {
        throw new Error(`Company with ID ${companyId} not found`);
      }
      
      return updatedCompany;
    } catch (error) {
      console.error('Failed to update company:', error);
      throw error;
    }
  }

  async deleteCompany(companyId: number): Promise<void> {
    try {
      // First delete all company members to avoid foreign key constraints
      await db
        .delete(companyMembers)
        .where(eq(companyMembers.companyId, companyId));
      
      // Then delete all company tags
      await db
        .delete(companyTags)
        .where(eq(companyTags.companyId, companyId));
      
      // Finally delete the company
      await db
        .delete(companies)
        .where(eq(companies.id, companyId));
      
      console.log(`Successfully deleted company with ID ${companyId}`);
    } catch (error) {
      console.error('Failed to delete company:', error);
      throw error;
    }
  }

  // Company members management methods
  async getCompanyMembers(companyId: number): Promise<(CompanyMember & { user: User & { person?: Person } })[]> {
    try {
      console.log(`Getting members for company ID: ${companyId}`);
      
      // First join company_members with users
      const result = await db
        .select({
          ...companyMembers,
          user: {
            ...users,
            person: people
          }
        })
        .from(companyMembers)
        .innerJoin(users, eq(companyMembers.userId, users.id))
        .leftJoin(people, eq(users.personId, people.id)) // Left join to include users without person records
        .where(eq(companyMembers.companyId, companyId));
      
      console.log(`Found ${result.length} company members`);
      return result;
    } catch (error) {
      console.error('Failed to get company members:', error);
      throw error;
    }
  }

  async addMemberToCompany(companyMembership: InsertCompanyMember): Promise<CompanyMember> {
    try {
      console.log('Adding member to company:', {
        companyId: companyMembership.companyId,
        userId: companyMembership.userId
      });
      
      // Prevent title from being set to the same as role (e.g., "owner"/"Owner")
      // This ensures internal roles don't appear as public titles
      let title = companyMembership.title;
      if (title && companyMembership.role && 
          title.toLowerCase() === companyMembership.role.toLowerCase()) {
        title = null;
      }
      
      // Check if membership already exists
      const existingMembership = await db
        .select()
        .from(companyMembers)
        .where(and(
          eq(companyMembers.companyId, companyMembership.companyId),
          eq(companyMembers.userId, companyMembership.userId)
        ))
        .limit(1);
      
      if (existingMembership.length > 0) {
        // Update existing membership
        const [updatedMembership] = await db
          .update(companyMembers)
          .set({
            role: companyMembership.role,
            title: title, // Use processed title
            isPublic: companyMembership.isPublic,
            addedBy: companyMembership.addedBy,
            updatedAt: new Date().toISOString()
          })
          .where(and(
            eq(companyMembers.companyId, companyMembership.companyId),
            eq(companyMembers.userId, companyMembership.userId)
          ))
          .returning();
        
        return updatedMembership;
      } else {
        // Create new membership with processed title
        const [newMembership] = await db
          .insert(companyMembers)
          .values({
            ...companyMembership,
            title: title, // Use processed title
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
          .returning();
        
        return newMembership;
      }
    } catch (error) {
      console.error('Failed to add member to company:', error);
      throw error;
    }
  }

  async updateCompanyMemberRole(companyId: number, userId: number, role: string): Promise<CompanyMember> {
    try {
      const [updatedMembership] = await db
        .update(companyMembers)
        .set({
          role,
          updatedAt: new Date().toISOString()
        })
        .where(and(
          eq(companyMembers.companyId, companyId),
          eq(companyMembers.userId, userId)
        ))
        .returning();
      
      if (!updatedMembership) {
        throw new Error(`Membership for company ${companyId} and user ${userId} not found`);
      }
      
      return updatedMembership;
    } catch (error) {
      console.error('Failed to update company member role:', error);
      throw error;
    }
  }

  async removeCompanyMember(companyId: number, userId: number): Promise<void> {
    try {
      await db
        .delete(companyMembers)
        .where(and(
          eq(companyMembers.companyId, companyId),
          eq(companyMembers.userId, userId)
        ));
      
      console.log(`Successfully removed user ${userId} from company ${companyId}`);
    } catch (error) {
      console.error('Failed to remove company member:', error);
      throw error;
    }
  }

  async getUserCompanies(userId: number): Promise<(Company & { role: string })[]> {
    try {
      const result = await db
        .select({
          ...companies,
          role: companyMembers.role
        })
        .from(companyMembers)
        .innerJoin(companies, eq(companyMembers.companyId, companies.id))
        .where(eq(companyMembers.userId, userId));
      
      return result;
    } catch (error) {
      console.error('Failed to get user companies:', error);
      throw error;
    }
  }

  async isCompanyAdmin(userId: number, companyId: number): Promise<boolean> {
    try {
      const result = await db
        .select()
        .from(companyMembers)
        .where(and(
          eq(companyMembers.companyId, companyId),
          eq(companyMembers.userId, userId),
          eq(companyMembers.role, 'admin')
        ))
        .limit(1);
      
      return result.length > 0;
    } catch (error) {
      console.error('Failed to check if user is company admin:', error);
      throw error;
    }
  }
  
  async isCompanyMember(userId: number, companyId: number): Promise<boolean> {
    try {
      const result = await db
        .select()
        .from(companyMembers)
        .where(and(
          eq(companyMembers.companyId, companyId),
          eq(companyMembers.userId, userId)
        ))
        .limit(1);
      
      return result.length > 0;
    } catch (error) {
      console.error('Failed to check if user is company member:', error);
      throw error;
    }
  }

  // Company tags management methods
  async getCompanyTags(companyId: number): Promise<Tag[]> {
    try {
      const result = await db
        .select({
          ...tags
        })
        .from(companyTags)
        .innerJoin(tags, eq(companyTags.tagId, tags.id))
        .where(eq(companyTags.companyId, companyId));
      
      return result;
    } catch (error) {
      console.error('Failed to get company tags:', error);
      throw error;
    }
  }

  async addTagToCompany(companyTag: InsertCompanyTag): Promise<CompanyTag> {
    try {
      // Check if tag is already associated with the company
      const existingTag = await db
        .select()
        .from(companyTags)
        .where(and(
          eq(companyTags.companyId, companyTag.companyId),
          eq(companyTags.tagId, companyTag.tagId)
        ))
        .limit(1);
      
      if (existingTag.length > 0) {
        return existingTag[0];
      }
      
      // Add new tag association
      const [newCompanyTag] = await db
        .insert(companyTags)
        .values(companyTag)
        .returning();
      
      return newCompanyTag;
    } catch (error) {
      console.error('Failed to add tag to company:', error);
      throw error;
    }
  }
  
  async syncCompanyTags(companyId: number, tagsList: string[]): Promise<Tag[]> {
    try {
      console.log(`Syncing tags for company ${companyId}:`, tagsList);
      
      // Get existing company tags
      const existingTags = await this.getCompanyTags(companyId);
      
      // Create a set of existing tag text for easy lookup
      const existingTagsSet = new Set(existingTags.map(tag => tag.text));
      
      // Process each tag in the new list
      for (const tagText of tagsList) {
        // Skip if tag is empty
        if (!tagText.trim()) continue;
        
        // Skip if tag already exists for this company
        if (existingTagsSet.has(tagText.toLowerCase())) {
          console.log(`Tag "${tagText}" already exists for company ${companyId}`);
          continue;
        }
        
        console.log(`Adding tag "${tagText}" to company ${companyId}`);
        
        // Check if tag exists in the tags table
        let tag = await db.query.tags.findFirst({
          where: sql`text = ${tagText.toLowerCase()}`
        });
        
        // If not, create the tag
        if (!tag) {
          const tagData: InsertTag = {
            text: tagText.toLowerCase()
          };
          
          [tag] = await db.insert(tags)
            .values(tagData)
            .returning();
            
          console.log(`Created new tag with ID ${tag.id}`);
        }
        
        // Create company-tag relationship
        await this.addTagToCompany({
          companyId,
          tagId: tag.id
        });
      }
      
      // Get updated tags after sync
      return this.getCompanyTags(companyId);
    } catch (error) {
      console.error(`Failed to sync tags for company ${companyId}:`, error);
      throw error;
    }
  }

  // Batch invite functionality
  async getUnclaimedPeople(): Promise<Person[]> {
    try {
      console.log('Fetching unclaimed people (people without user accounts)...');
      
      // Find people who have an email but no associated user account
      const result = await db
        .select({
          id: people.id,
          api_id: people.api_id,
          createdAt: people.createdAt,
          email: people.email,
          userName: people.userName,
          fullName: people.fullName,
          avatarUrl: people.avatarUrl,
          role: people.role,
          phoneNumber: people.phoneNumber,
          bio: people.bio,
          stats: people.stats
        })
        .from(people)
        .leftJoin(users, eq(users.email, people.email))
        .where(and(
          sql`${people.email} IS NOT NULL`,
          sql`${people.email} != ''`,
          sql`${users.id} IS NULL`
        ));
      
      console.log(`Found ${result.length} unclaimed people`);
      return result;
    } catch (error) {
      console.error('Failed to get unclaimed people:', error);
      throw error;
    }
  }
}

export const storage = new PostgresStorage();