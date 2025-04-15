// Script to run the company industries sync migration
import { syncCompanyIndustries } from '../server/migrations/sync-company-industries.js';

// Run the migration
console.log('Running company industries sync...');
syncCompanyIndustries()
  .then(() => {
    console.log('Company industries sync completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Company industries sync failed:', error);
    process.exit(1);
  });