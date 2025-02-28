import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { sql } from "drizzle-orm";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

// Check if tables exist before performing any automated migrations
export async function ensureTablesExist() {
  try {
    // Check if the tables exist with direct SQL query
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'events'
      ) as exists;
    `);

    const exists = result.rows.length > 0 && result.rows[0].exists === true;

    if (!exists) {
      console.log('Database tables do not exist. Creating them now...');

      // Use the drizzle-orm migration functionality which is safer than push
      // This will ensure the tables are created but won't reset data unnecessarily
      const queries = [`
        CREATE TABLE IF NOT EXISTS "cache_metadata" (
          "id" SERIAL PRIMARY KEY,
          "key" VARCHAR(255) NOT NULL UNIQUE,
          "value" TEXT NOT NULL,
          "updated_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
        );

        CREATE TABLE IF NOT EXISTS "events" (
          "id" SERIAL PRIMARY KEY,
          "api_id" VARCHAR(255) NOT NULL UNIQUE,
          "title" TEXT NOT NULL,
          "description" TEXT,
          "start_time" TIMESTAMPTZ NOT NULL,
          "end_time" TIMESTAMPTZ NOT NULL,
          "cover_url" VARCHAR(255),
          "url" VARCHAR(255),
          "timezone" VARCHAR(50),
          "location" JSONB,
          "visibility" VARCHAR(50),
          "meeting_url" VARCHAR(255),
          "calendar_api_id" VARCHAR(255),
          "created_at" TIMESTAMPTZ
        );

        CREATE TABLE IF NOT EXISTS "people" (
          "id" SERIAL PRIMARY KEY,
          "api_id" VARCHAR(255) NOT NULL UNIQUE,
          "email" VARCHAR(255) NOT NULL,
          "user_name" VARCHAR(255),
          "full_name" VARCHAR(255),
          "avatar_url" VARCHAR(255),
          "role" VARCHAR(100),
          "phone_number" VARCHAR(100),
          "bio" TEXT,
          "organization_name" VARCHAR(255),
          "job_title" VARCHAR(255),
          "created_at" TIMESTAMPTZ
        );

        CREATE TABLE IF NOT EXISTS "users" (
          "id" SERIAL PRIMARY KEY,
          "email" VARCHAR(255) NOT NULL UNIQUE,
          "display_name" VARCHAR(255),
          "is_verified" BOOLEAN NOT NULL DEFAULT FALSE,
          "person_id" INTEGER REFERENCES people(id),
          "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS "verification_tokens" (
          "id" SERIAL PRIMARY KEY,
          "token" VARCHAR(255) NOT NULL UNIQUE,
          "email" VARCHAR(255) NOT NULL,
          "expires_at" TIMESTAMPTZ NOT NULL,
          "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS "event_rsvp_status" (
          "id" SERIAL PRIMARY KEY,
          "user_api_id" VARCHAR(255) NOT NULL,
          "event_api_id" VARCHAR(255) NOT NULL,
          "status" VARCHAR(50) NOT NULL,
          "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE("user_api_id", "event_api_id")
        );

        CREATE TABLE IF NOT EXISTS "attendance" (
          "id" SERIAL PRIMARY KEY,
          "event_api_id" VARCHAR(255) NOT NULL,
          "user_email" VARCHAR(255) NOT NULL,
          "guest_api_id" VARCHAR(255) NOT NULL UNIQUE,
          "approval_status" VARCHAR(50) NOT NULL,
          "registered_at" TIMESTAMPTZ,
          "last_synced_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `];

      // Execute the queries
      for (const query of queries) {
        await db.execute(sql.raw(query));
      }

      console.log('Database tables created successfully');
    } else {
      console.log('Database tables already exist, skipping creation');
    }
  } catch (error) {
    console.error('Error ensuring tables exist:', error);
    throw error; // We should throw here since table creation is critical
  }
}