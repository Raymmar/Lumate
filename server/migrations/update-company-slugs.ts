import { db } from '../db';
import { companies } from '../../shared/schema';
import { and, eq, isNull } from 'drizzle-orm';

// Helper function to generate a slug from a company name (same as in routes)
const generateSlug = (name: string): string => {
  return name
    .replace(/\./g, '') // Remove periods
    .replace(/&/g, 'and') // Replace & with 'and'
    .normalize('NFKD') // Normalize Unicode characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics/accents
    .replace(/[^\w\s-]/g, ' ') // Replace special chars with spaces
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-{2,}/g, '-') // Collapse multiple hyphens
    .replace(/^-+|-+$/g, ''); // Trim hyphens from start/end
};

// Function to migrate company slugs
export async function migrateCompanySlugs() {
  try {
    console.log('Starting to migrate company slugs...');
    
    // Get all companies without a slug
    const companiesWithoutSlug = await db
      .select()
      .from(companies)
      .where(isNull(companies.slug));
    
    console.log(`Found ${companiesWithoutSlug.length} companies without slugs.`);
    
    // Update each company with a slug derived from its name
    for (const company of companiesWithoutSlug) {
      if (!company.name) {
        console.warn(`Company ID ${company.id} has no name, skipping...`);
        continue;
      }
      
      // Generate slug from name
      const slug = generateSlug(company.name);
      
      // Update the company with the new slug
      await db
        .update(companies)
        .set({ 
          slug,
          updatedAt: new Date().toISOString()
        })
        .where(eq(companies.id, company.id));
      
      console.log(`Updated company "${company.name}" with slug "${slug}"`);
    }
    
    console.log('Completed company slug migration!');
  } catch (error) {
    console.error('Failed to migrate company slugs:', error);
    throw error;
  }
}

// Run the migration when this script is executed directly
migrateCompanySlugs()
  .then(() => {
    console.log('Migration completed successfully');
    // No need to exit process explicitly in ESM
  })
  .catch((error) => {
    console.error('Migration failed:', error);
  });