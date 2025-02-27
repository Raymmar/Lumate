import { pgTable, text, serial, timestamp, varchar, integer, jsonb, boolean as pgBoolean } from "drizzle-orm/pg-core";
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
  location: jsonb("location").$type<{
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
  avatarUrl: varchar("avatar_url", { length: 255 }),
  createdAt: timestamp("created_at", { mode: 'string', withTimezone: true }),
  eventApprovedCount: integer("event_approved_count").default(0),
  eventCheckedInCount: integer("event_checked_in_count").default(0),
  revenueUsdCents: integer("revenue_usd_cents").default(0),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  displayName: varchar("display_name", { length: 255 }),
  isVerified: pgBoolean("is_verified").notNull().default(false),
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

export const insertEventSchema = createInsertSchema(events);
export const insertPersonSchema = createInsertSchema(people);
export const insertCacheMetadataSchema = createInsertSchema(cacheMetadata).omit({ id: true, updatedAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertVerificationTokenSchema = createInsertSchema(verificationTokens).omit({ id: true, createdAt: true });

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Person = typeof people.$inferSelect;
export type InsertPerson = z.infer<typeof insertPersonSchema>;
export type CacheMetadata = typeof cacheMetadata.$inferSelect;
export type InsertCacheMetadata = z.infer<typeof insertCacheMetadataSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type VerificationToken = typeof verificationTokens.$inferSelect;
export type InsertVerificationToken = z.infer<typeof insertVerificationTokenSchema>;