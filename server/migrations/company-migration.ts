import { db } from "../db";
import { sql } from "drizzle-orm";
import {
  users, companies, companyMembers, companyTags, tags,
  InsertCompany, InsertCompanyMember, InsertCompanyTag, InsertTag
} from "@shared/schema";

/**
 * Migrates company information from user profiles to the companies table.
 * This creates new company entries based on the existing user profile data
 * and establishes relationships through the company_members table.
 * 
 * @param progressCallback Optional callback function to report progress
 */
export async function migrateCompanyInformation(
  progressCallback?: (message: string, progress: number, data?: any) => void
) {
  console.log("Starting company information migration...");
  
  // Report initial progress
  progressCallback?.("Starting company data migration...", 5);
  
  // Get all users with company information
  const usersWithCompanyInfo = await db.query.users.findMany({
    where: sql`(company_name IS NOT NULL AND company_name != '') OR 
               (company_description IS NOT NULL AND company_description != '')`,
  });
  
  console.log(`Found ${usersWithCompanyInfo.length} users with company information to migrate`);
  progressCallback?.(`Found ${usersWithCompanyInfo.length} users with company information`, 15);
  
  // For each user with company info, create a company and establish relationship
  let created = 0;
  let skipped = 0;
  
  for (let i = 0; i < usersWithCompanyInfo.length; i++) {
    const user = usersWithCompanyInfo[i];
    
    try {
      if (!user.companyName?.trim()) {
        console.log(`Skipping user ${user.id} (${user.email}) - missing company name`);
        skipped++;
        continue;
      }
      
      // Calculate and report progress (15-90% range)
      const currentProgress = 15 + Math.floor((i / usersWithCompanyInfo.length) * 75);
      progressCallback?.(`Migrating company: ${user.companyName}`, currentProgress);
      
      console.log(`Migrating company info for user ${user.id} (${user.email}): ${user.companyName}`);
      
      // Create new company record
      const companyData: InsertCompany = {
        name: user.companyName,
        description: user.companyDescription || null,
        bio: user.bio || null,
        address: user.address || null,
        phoneNumber: user.phoneNumber || null,
        email: user.email || null,
        featuredImageUrl: user.featuredImageUrl || null,
        isPhonePublic: user.isPhonePublic,
        isEmailPublic: user.isEmailPublic,
        ctaText: user.ctaText || null,
        customLinks: user.customLinks || [],
        tags: user.tags || []
      };
      
      // Insert the company
      const [company] = await db.insert(companies)
        .values([companyData]) // wrap in array to fix TypeScript error
        .returning();
      
      // Create company membership for this user
      const companyMemberData: InsertCompanyMember = {
        companyId: company.id,
        userId: user.id,
        role: 'admin', // Make the user who owned the company info an admin
        title: null,
        isPublic: true,
        addedBy: user.id
      };
      
      await db.insert(companyMembers)
        .values([companyMemberData]) // wrap in array to fix TypeScript error
        .returning();
      
      // Handle tags - ensure they exist in the tags table and create companyTags relationships
      if (user.tags && user.tags.length > 0) {
        for (const tagText of user.tags) {
          // Check if tag exists
          let tag = await db.query.tags.findFirst({
            where: sql`text = ${tagText.toLowerCase()}`
          });
          
          // If not, create it
          if (!tag) {
            const tagData: InsertTag = {
              text: tagText.toLowerCase()
            };
            
            [tag] = await db.insert(tags)
              .values([tagData]) // wrap in array to fix TypeScript error
              .returning();
          }
          
          // Create company-tag relationship
          const companyTagData: InsertCompanyTag = {
            companyId: company.id,
            tagId: tag.id
          };
          
          await db.insert(companyTags)
            .values([companyTagData]); // wrap in array to fix TypeScript error
        }
      }
      
      created++;
      console.log(`Successfully migrated company "${company.name}" (ID: ${company.id}) for user ${user.id}`);
      
    } catch (error) {
      console.error(`Error migrating company for user ${user.id} (${user.email}):`, error);
    }
  }
  
  // Final progress update
  progressCallback?.("Finalizing migration...", 95);
  
  const result = {
    total: usersWithCompanyInfo.length,
    created,
    skipped
  };
  
  console.log("Company migration completed:");
  console.log(`- Total users processed: ${usersWithCompanyInfo.length}`);
  console.log(`- Companies created: ${created}`);
  console.log(`- Users skipped: ${skipped}`);
  
  // Complete the migration
  progressCallback?.("Migration completed successfully", 100, result);
  
  return result;
}

// ES modules don't have require.main === module
// This functionality is handled by the scripts/run-migration.js file instead