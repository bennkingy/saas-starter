import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const envPath = path.join(process.cwd(), '.env');

dotenv.config({ path: envPath });

if (process.env.CRON_SECRET) {
  console.log('✅ CRON_SECRET is already set');
  process.exit(0);
}

const cronSecret = crypto.randomBytes(32).toString('hex');

let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf-8');
}

if (envContent && !envContent.includes('CRON_SECRET=')) {
  envContent += `\nCRON_SECRET=${cronSecret}\n`;
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Added CRON_SECRET to .env file');
} else if (!envContent.includes('CRON_SECRET=')) {
  fs.appendFileSync(envPath, `CRON_SECRET=${cronSecret}\n`);
  console.log('✅ Created .env file with CRON_SECRET');
} else {
  console.log('✅ CRON_SECRET already exists in .env file');
}

console.log(`\n🔑 CRON_SECRET: ${cronSecret}`);
