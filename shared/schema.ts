import { pgTable, text, serial, timestamp, varchar, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  api_id: varchar("api_id", { length: 255 }).notNull(),
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
  api_id: varchar("api_id", { length: 255 }).notNull(),
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

export const insertEventSchema = createInsertSchema(events);
export const insertPersonSchema = createInsertSchema(people);

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Person = typeof people.$inferSelect;
export type InsertPerson = z.infer<typeof insertPersonSchema>;