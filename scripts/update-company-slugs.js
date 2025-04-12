// Script to run the company slug migration
import { spawn } from 'child_process';

console.log('Running company slug migration...');

// Use tsx to run the TypeScript migration file
const child = spawn('npx', ['tsx', 'server/migrations/update-company-slugs.ts']);

child.stdout.on('data', (data) => {
  console.log(`${data}`);
});

child.stderr.on('data', (data) => {
  console.error(`${data}`);
});

child.on('close', (code) => {
  if (code === 0) {
    console.log('Migration completed successfully!');
  } else {
    console.error(`Migration failed with code ${code}`);
  }
});