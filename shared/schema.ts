import { pgTable, text, serial, timestamp, varchar, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }),
  avatarUrl: varchar("avatar_url", { length: 255 }),
});

export const people = pgTable("people", {
  id: serial("id").primaryKey(),
  apiId: varchar("api_id", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  eventApprovedCount: integer("event_approved_count").notNull().default(0),
  eventCheckedInCount: integer("event_checked_in_count").notNull().default(0),
  revenueUsdCents: integer("revenue_usd_cents").notNull().default(0),
  userId: integer("user_id").references(() => users.id),
});

export const insertEventSchema = createInsertSchema(events);
export const insertUserSchema = createInsertSchema(users);
export const insertPersonSchema = createInsertSchema(people);

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Person = typeof people.$inferSelect;
export type InsertPerson = z.infer<typeof insertPersonSchema>;

export type PersonWithUser = Person & {
  user: User | null;
};