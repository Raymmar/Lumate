import { db } from "../db.js";
import { industries } from "../../shared/schema.js";

export async function seedIndustries() {
  console.log("Starting industry seeding process...");
  
  const defaultIndustries = [
    { name: "Technology" },
    { name: "Software Development" },
    { name: "Information Technology" },
    { name: "Artificial Intelligence" },
    { name: "Fintech" },
    { name: "Cybersecurity" },
    { name: "E-commerce" },
    { name: "SaaS" },
    { name: "Web3" },
    { name: "Healthcare" },
    { name: "Biotech" },
    { name: "Finance" },
    { name: "Real Estate" },
    { name: "Marketing" },
    { name: "Education" },
    { name: "Consulting" },
    { name: "Design" },
    { name: "Media" },
    { name: "Aerospace" },
    { name: "Agriculture" },
    { name: "Food & Beverage" },
    { name: "Retail" },
    { name: "Transportation" },
    { name: "Hospitality" },
    { name: "Environmental" },
    { name: "Energy" },
    { name: "Non-profit" },
    { name: "Government" },
    { name: "Manufacturing" },
    { name: "Digital Marketing" },
    { name: "Media & Entertainment" },
    { name: "Finance & Banking" },
    { name: "AI & Machine Learning" },
    { name: "IT Services & Consulting" },
    { name: "Legal Services" },
    { name: "Other" }
  ];

  try {
    // Check if the industries table exists
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
          isActive: true
        });
        console.log(`Added industry: ${industry.name}`);
      }
      
      console.log(`Successfully added ${industriesToAdd.length} new industries.`);
    } catch (err) {
      console.log("Error checking existing industries, inserting all defaults:", err);
      
      // If table doesn't exist or other error, add all industries
      for (const industry of defaultIndustries) {
        try {
          await db.insert(industries).values({
            name: industry.name,
            isActive: true
          });
          console.log(`Added industry: ${industry.name}`);
        } catch (insertErr) {
          console.error(`Failed to add industry ${industry.name}:`, insertErr);
        }
      }
    }
  } catch (error) {
    console.error("Error seeding industries:", error);
    throw error;
  }
}