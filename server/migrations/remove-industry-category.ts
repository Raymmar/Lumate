import { db } from '../db.js';
import { sql } from 'drizzle-orm';
import { pathToFileURL } from 'node:url';

/**
 * Migration to remove the category column from the industries table
 * This completes the transition to a flat industry structure without categories
 */
export async function removeIndustryCategoryColumn() {
  console.log('Starting migration: Removing category column from industries table...');
  
  try {
    // Run raw SQL to remove the column
    await db.execute(sql`ALTER TABLE industries DROP COLUMN IF EXISTS category;`);
    console.log('Successfully removed category column from industries table');
    return { success: true, message: 'Category column successfully removed from industries table' };
  } catch (error) {
    console.error('Error removing category column from industries table:', error);
    return { success: false, message: 'Failed to remove category column', error };
  }
}

// Allow the migration to be run directly from the command line
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  removeIndustryCategoryColumn()
    .then(result => {
      console.log('Migration result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('Migration failed with error:', err);
      process.exit(1);
    });
}