// A simple script to run the company migration directly

import { migrateCompanyInformation } from '../server/migrations/company-migration.ts';

console.log('Starting company data migration...');

migrateCompanyInformation()
  .then((result) => {
    console.log('Migration completed successfully:');
    console.log(`- Total users processed: ${result.total}`);
    console.log(`- Companies created: ${result.created}`);
    console.log(`- Users skipped: ${result.skipped}`);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });