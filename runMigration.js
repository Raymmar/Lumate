// Run the company data migration directly using the node API
import { migrateCompanyInformation } from './server/migrations/company-migration.ts';

console.log('Starting company data migration directly...');

// Call the function directly
try {
  migrateCompanyInformation()
    .then(result => {
      console.log('Migration completed successfully:');
      console.log(`- Total users processed: ${result.total}`);
      console.log(`- Companies created: ${result.created}`);
      console.log(`- Users skipped: ${result.skipped}`);
    })
    .catch(err => {
      console.error('Migration failed:', err);
    });
} catch (err) {
  console.error('Error initiating migration:', err);
}