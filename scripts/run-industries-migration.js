// Script to run the industry seeding migration

require('tsx/cjs').register();

// Import the migration
const { seedIndustries } = require('../server/migrations/seed-industries');

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