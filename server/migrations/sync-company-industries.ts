import { db } from "../db.js";
import { companies, industries, companyIndustries } from "../../shared/schema.js";
import { eq, sql } from "drizzle-orm";

export async function syncCompanyIndustries() {
  console.log("Starting company industry syncing process...");
  
  try {
    // Get all companies with non-null industries
    const companyRecords = await db
      .select({
        id: companies.id,
        name: companies.name,
        industry: companies.industry
      })
      .from(companies)
      .where(sql`${companies.industry} IS NOT NULL AND ${companies.industry} <> ''`);
    
    console.log(`Found ${companyRecords.length} companies with industry values to sync.`);
    
    // Get all industries
    const industryRecords = await db.select().from(industries);
    const industryMap = new Map(industryRecords.map(i => [i.name.toLowerCase(), i.id]));
    
    let matchedCount = 0;
    let unmatchedCount = 0;
    let unmatchedIndustries = new Set();
    let updatedCompanies = 0;
    
    // For each company with an industry, try to match it to an industry in our table
    for (const company of companyRecords) {
      if (!company.industry) continue;
      
      // Check for exact match first
      let matchFound = false;
      let matchedIndustryId = null;
      const companyIndustryLower = company.industry.toLowerCase().trim();
      
      if (industryMap.has(companyIndustryLower)) {
        matchedIndustryId = industryMap.get(companyIndustryLower);
        console.log(`Industry match found for company '${company.name}': '${company.industry}' (ID: ${matchedIndustryId})`);
        matchedCount++;
        matchFound = true;
        
        // Check if this company already has this industry linked
        const existingLink = await db.execute(
          sql`SELECT * FROM company_industries WHERE company_id = ${company.id} AND industry_id = ${matchedIndustryId} LIMIT 1`
        );
        
        if (!existingLink.rows || existingLink.rows.length === 0) {
          // Add the industry to the company with raw SQL
          await db.execute(
            sql`INSERT INTO company_industries (company_id, industry_id, created_at, updated_at) 
                VALUES (${company.id}, ${matchedIndustryId}, NOW(), NOW())`
          );
          
          updatedCompanies++;
          console.log(`Added industry '${company.industry}' to company '${company.name}'`);
        } else {
          console.log(`Company '${company.name}' already has industry '${company.industry}' linked`);
        }
      }
      
      if (!matchFound) {
        console.log(`No exact industry match for company '${company.name}': '${company.industry}'`);
        unmatchedCount++;
        unmatchedIndustries.add(company.industry);
      }
    }
    
    // Report statistics
    console.log(`Industry matching complete:`);
    console.log(`- ${matchedCount} companies have matching industries`);
    console.log(`- ${unmatchedCount} companies have unmatched industries`);
    console.log(`- ${updatedCompanies} companies had industries added to them`);

    // Report unmatched industries
    if (unmatchedIndustries.size > 0) {
      console.log(`\nUnmatched industries (consider adding these to the industries table):`);
      Array.from(unmatchedIndustries).forEach(industry => {
        console.log(`- "${industry}"`);
      });
    }
    
    console.log(`\nSync process completed.`);
  } catch (error) {
    console.error("Error syncing company industries:", error);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  syncCompanyIndustries()
    .then(() => {
      console.log("Company industry syncing complete.");
      process.exit(0);
    })
    .catch(error => {
      console.error("Company industry syncing failed:", error);
      process.exit(1);
    });
}