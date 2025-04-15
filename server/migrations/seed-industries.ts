import { db } from "../db";
import { industries } from "../../shared/schema";

export async function seedIndustries() {
  console.log("Starting industry seeding process...");
  
  const defaultIndustries = [
    { name: "Technology", category: "Tech" },
    { name: "Software Development", category: "Tech" },
    { name: "Information Technology", category: "Tech" },
    { name: "Artificial Intelligence", category: "Tech" },
    { name: "Fintech", category: "Tech" },
    { name: "Cybersecurity", category: "Tech" },
    { name: "E-commerce", category: "Tech" },
    { name: "SaaS", category: "Tech" },
    { name: "Web3", category: "Tech" },
    { name: "Healthcare", category: "Healthcare" },
    { name: "Biotech", category: "Healthcare" },
    { name: "Finance", category: "Business" },
    { name: "Real Estate", category: "Business" },
    { name: "Marketing", category: "Business" },
    { name: "Education", category: "Other" },
    { name: "Consulting", category: "Business" },
    { name: "Design", category: "Creative" },
    { name: "Media", category: "Creative" },
    { name: "Aerospace", category: "Manufacturing" },
    { name: "Agriculture", category: "Other" },
    { name: "Food & Beverage", category: "Other" },
    { name: "Retail", category: "Business" },
    { name: "Transportation", category: "Other" },
    { name: "Hospitality", category: "Service" },
    { name: "Environmental", category: "Other" },
    { name: "Energy", category: "Other" },
    { name: "Non-profit", category: "Other" },
    { name: "Government", category: "Other" },
    { name: "Manufacturing", category: "Manufacturing" }
  ];

  try {
    const existingIndustries = await db.query.industries.findMany();
    const existingIndustryNames = new Set(existingIndustries.map(i => i.name.toLowerCase()));
    
    const industriesToAdd = defaultIndustries.filter(
      industry => !existingIndustryNames.has(industry.name.toLowerCase())
    );
    
    if (industriesToAdd.length === 0) {
      console.log("No new industries to add, all defaults already exist.");
      return;
    }
    
    for (const industry of industriesToAdd) {
      await db.insert(industries).values({
        name: industry.name,
        category: industry.category,
        isActive: true
      });
      console.log(`Added industry: ${industry.name}`);
    }
    
    console.log(`Successfully added ${industriesToAdd.length} new industries.`);
  } catch (error) {
    console.error("Error seeding industries:", error);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  seedIndustries()
    .then(() => {
      console.log("Industry seeding complete.");
      process.exit(0);
    })
    .catch(error => {
      console.error("Industry seeding failed:", error);
      process.exit(1);
    });
}