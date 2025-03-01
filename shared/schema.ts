import { pgTable, text, serial, timestamp, varchar, json, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const cacheMetadata = pgTable("cache_metadata", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string', withTimezone: true }).notNull().defaultNow(),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  api_id: varchar("api_id", { length: 255 }).notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time", { mode: 'string', withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { mode: 'string', withTimezone: true }).notNull(),
  coverUrl: varchar("cover_url", { length: 255 }),
  url: varchar("url", { length: 255 }),
  timezone: varchar("timezone", { length: 50 }),
  location: json("location").$type<{
    city?: string;
    region?: string;
    country?: string;
    latitude?: string;
    longitude?: string;
    full_address?: string;
  }>(),
  visibility: varchar("visibility", { length: 50 }),
  meetingUrl: varchar("meeting_url", { length: 255 }),
  calendarApiId: varchar("calendar_api_id", { length: 255 }),
  lastAttendanceSync: timestamp("last_attendance_sync", { mode: 'string', withTimezone: true }),
  createdAt: timestamp("created_at", { mode: 'string', withTimezone: true }),
});

export const people = pgTable("people", {
  id: serial("id").primaryKey(),
  api_id: varchar("api_id", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull(),
  userName: varchar("user_name", { length: 255 }),
  fullName: varchar("full_name", { length: 255 }),
  avatarUrl: varchar("avatar_url", { length: 255 }),
  role: varchar("role", { length: 50 }),
  phoneNumber: varchar("phone_number", { length: 50 }),
  bio: text("bio"),
  organizationName: varchar("organization_name", { length: 255 }),
  jobTitle: varchar("job_title", { length: 255 }),
  createdAt: timestamp("created_at", { mode: 'string', withTimezone: true }),
  stats: json("stats").$type<{
    totalEventsAttended: number;
    lastEventDate: string | null;
    firstEventDate: string | null;
    averageEventsPerYear?: number;
    lastUpdated: string;
  }>().default({
    totalEventsAttended: 0,
    lastEventDate: null,
    firstEventDate: null,
    lastUpdated: new Date().toISOString()
  }),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  displayName: varchar("display_name", { length: 255 }),
  password: varchar("password", { length: 255 }),
  isVerified: boolean("is_verified").notNull().default(false),
  personId: serial("person_id").references(() => people.id),
  createdAt: timestamp("created_at", { mode: 'string', withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string', withTimezone: true }).notNull().defaultNow(),
});

export const verificationTokens = pgTable("verification_tokens", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at", { mode: 'string', withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { mode: 'string', withTimezone: true }).notNull().defaultNow(),
});

export const eventRsvpStatus = pgTable("event_rsvp_status", {
  id: serial("id").primaryKey(),
  userApiId: varchar("user_api_id", { length: 255 }).notNull(),
  eventApiId: varchar("event_api_id", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string', withTimezone: true }).notNull().defaultNow(),
});

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  eventApiId: varchar("event_api_id", { length: 255 }).notNull(),
  userEmail: varchar("user_email", { length: 255 }).notNull(),
  guestApiId: varchar("guest_api_id", { length: 255 }).notNull().unique(),
  approvalStatus: varchar("approval_status", { length: 50 }).notNull(),
  registeredAt: timestamp("registered_at", { mode: 'string', withTimezone: true }),
  lastSyncedAt: timestamp("last_synced_at", { mode: 'string', withTimezone: true }).notNull().defaultNow(),
  userId: serial("user_id").references(() => users.id),
  personId: serial("person_id").references(() => people.id),
});

// Add new tables for posts and tags
export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  text: varchar("text", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at", { mode: 'string', withTimezone: true }).notNull().defaultNow(),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  summary: text("summary"),
  body: text("body").notNull(),
  featuredImage: varchar("featured_image", { length: 255 }),
  videoUrl: varchar("video_url", { length: 255 }),
  ctaLink: varchar("cta_link", { length: 255 }),
  ctaLabel: varchar("cta_label", { length: 255 }),
  isPinned: boolean("is_pinned").notNull().default(false),
  creatorId: serial("creator_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at", { mode: 'string', withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string', withTimezone: true }).notNull().defaultNow(),
});

export const postTags = pgTable("post_tags", {
  id: serial("id").primaryKey(),
  postId: serial("post_id").references(() => posts.id).notNull(),
  tagId: serial("tag_id").references(() => tags.id).notNull(),
});

// Add insert schemas for new tables
export const insertTagSchema = createInsertSchema(tags).omit({ 
  id: true, 
  createdAt: true 
}).transform((data) => ({
  ...data,
  text: data.text.toLowerCase() // Ensure tags are stored in lowercase
}));

export const insertPostSchema = createInsertSchema(posts).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  creatorId: true
});

export const insertPostTagSchema = createInsertSchema(postTags).omit({ 
  id: true 
});

// Add types for new tables
export type Tag = typeof tags.$inferSelect;
export type InsertTag = z.infer<typeof insertTagSchema>;

export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;

export type PostTag = typeof postTags.$inferSelect;
export type InsertPostTag = z.infer<typeof insertPostTagSchema>;


export const insertEventSchema = createInsertSchema(events);
export const insertPersonSchema = createInsertSchema(people);
export const insertCacheMetadataSchema = createInsertSchema(cacheMetadata).omit({ id: true, updatedAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, isVerified: true, createdAt: true, updatedAt: true });
export const insertVerificationTokenSchema = createInsertSchema(verificationTokens).omit({ id: true, createdAt: true });
export const insertEventRsvpStatusSchema = createInsertSchema(eventRsvpStatus).omit({ id: true, updatedAt: true });
export const insertAttendanceSchema = createInsertSchema(attendance).omit({ id: true, lastSyncedAt: true });

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Person = typeof people.$inferSelect;
export type InsertPerson = z.infer<typeof insertPersonSchema>;
export type CacheMetadata = typeof cacheMetadata.$inferSelect;
export type InsertCacheMetadata = z.infer<typeof insertCacheMetadataSchema>;
export type User = typeof users.$inferSelect & {
  api_id?: string;
};
export type InsertUser = z.infer<typeof insertUserSchema>;
export type VerificationToken = typeof verificationTokens.$inferSelect;
export type InsertVerificationToken = z.infer<typeof insertVerificationTokenSchema>;
export type EventRsvpStatus = typeof eventRsvpStatus.$inferSelect;
export type InsertEventRsvpStatus = z.infer<typeof insertEventRsvpStatusSchema>;
export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;

export const updatePasswordSchema = z.object({
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must not exceed 100 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export type UpdatePassword = z.infer<typeof updatePasswordSchema>;