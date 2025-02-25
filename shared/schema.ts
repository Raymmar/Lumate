import { pgTable, text, serial, timestamp, varchar, integer, decimal, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  api_id: text("api_id").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  start_at: timestamp("start_at").notNull(),
  end_at: timestamp("end_at").notNull(),
  cover_url: text("cover_url"),
  url: text("url"),
  geo_address_json: text("geo_address_json"),
  last_synced_at: timestamp("last_synced_at").notNull().defaultNow(),
});

export const people = pgTable("people", {
  id: serial("id").primaryKey(),
  api_id: text("api_id").notNull().unique(),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  avatar_url: text("avatar_url"),
  website_url: text("website_url"),
  linkedin_url: text("linkedin_url"),
  total_events_attended: integer("total_events_attended").default(0),
  total_spent: decimal("total_spent", { precision: 10, scale: 2 }).default("0"),
  is_host: boolean("is_host").default(false),
  last_synced_at: timestamp("last_synced_at").notNull().defaultNow(),
});

// For future user authentication
export const auth_users = pgTable("auth_users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password_hash: text("password_hash").notNull(),
  person_id: integer("person_id").references(() => people.id),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

// Create the insert schemas
export const insertEventSchema = createInsertSchema(events).omit({ id: true });
export const insertPersonSchema = createInsertSchema(people).omit({ id: true });
export const insertAuthUserSchema = createInsertSchema(auth_users).omit({ id: true, created_at: true, updated_at: true });

// Export the types
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Person = typeof people.$inferSelect;
export type InsertPerson = z.infer<typeof insertPersonSchema>;
export type AuthUser = typeof auth_users.$inferSelect;
export type InsertAuthUser = z.infer<typeof insertAuthUserSchema>;