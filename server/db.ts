import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import ws from "ws";
import * as schema from "@shared/schema";
import path from 'path';
import fs from 'fs';
import { sql } from 'drizzle-orm';

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
    // Check if the 'events' table exists with direct SQL query
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
          "userName" VARCHAR(255),
          "fullName" VARCHAR(255),
          "avatarUrl" VARCHAR(255),
          "role" VARCHAR(100),
          "phoneNumber" VARCHAR(100),
          "bio" TEXT,
          "organizationName" VARCHAR(255),
          "jobTitle" VARCHAR(255),
          "createdAt" TIMESTAMPTZ
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
    // Don't throw - we'll continue startup even if this fails
  }
}
