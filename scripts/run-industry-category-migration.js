// Script to run the industry category column removal migration
import { removeIndustryCategoryColumn } from '../server/migrations/remove-industry-category.js';

console.log('Running the migration to remove the category column from industries table...');

removeIndustryCategoryColumn()
  .then(result => {
    if (result.success) {
      console.log('✅ Migration completed successfully:', result.message);
      process.exit(0);
    } else {
      console.error('❌ Migration failed:', result.message);
      console.error(result.error);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Error while running migration:', error);
    process.exit(1);
  });