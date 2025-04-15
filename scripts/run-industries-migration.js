// Script to run the industry seeding migration
import { seedIndustries } from '../server/migrations/seed-industries.js';

// Run the migration
console.log('Running industry migration...');
seedIndustries()
  .then(() => {
    console.log('Industry migration completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Industry migration failed:', error);
    process.exit(1);
  });