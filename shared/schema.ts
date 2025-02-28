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
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  displayName: varchar("display_name", { length: 255 }),
  password: varchar("password", { length: 255 }),
  isVerified: boolean("is_verified").notNull().default(false),
  personId: serial("person_id").references(() => people.id),
  website: varchar("website", { length: 255 }),
  instagram: varchar("instagram", { length: 255 }),
  youtube: varchar("youtube", { length: 255 }),
  linkedin: varchar("linkedin", { length: 255 }),
  shortBio: text("short_bio"),
  ctaLabel: varchar("cta_label", { length: 100 }),
  ctaUrl: varchar("cta_url", { length: 255 }),
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

export const insertEventSchema = createInsertSchema(events);
export const insertPersonSchema = createInsertSchema(people);
export const insertCacheMetadataSchema = createInsertSchema(cacheMetadata).omit({ id: true, updatedAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, isVerified: true, createdAt: true, updatedAt: true });
export const insertVerificationTokenSchema = createInsertSchema(verificationTokens).omit({ id: true, createdAt: true });

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

export const updatePasswordSchema = z.object({
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must not exceed 100 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export type UpdatePassword = z.infer<typeof updatePasswordSchema>;

export const updateProfileSchema = z.object({
  displayName: z.string().min(1, "Display name is required"),
  website: z.string().url("Invalid website URL").optional().nullable(),
  instagram: z.string().optional().nullable(),
  youtube: z.string().url("Invalid YouTube URL").optional().nullable(),
  linkedin: z.string().url("Invalid LinkedIn URL").optional().nullable(),
  shortBio: z.string().max(500, "Bio must be less than 500 characters").optional().nullable(),
  ctaLabel: z.string().max(50, "Call to action label must be less than 50 characters").optional().nullable(),
  ctaUrl: z.string().url("Invalid call to action URL").optional().nullable(),
});

export type UpdateProfile = z.infer<typeof updateProfileSchema>;