import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET;
const DRY_RUN = process.env.CRON_DRY_RUN !== '0';

async function runCron() {
  if (!CRON_SECRET) {
    console.error('❌ Error: CRON_SECRET is not set in .env file');
    console.log('Please add CRON_SECRET to your .env file');
    process.exit(1);
  }

  const url = `${BASE_URL}/api/cron/stock-check${DRY_RUN ? '?dryRun=1' : ''}`;
  
  console.log(`🔄 Running cron job: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-cron-secret': CRON_SECRET,
      },
    });

    const text = await response.text();
    let data;
    
    try {
      data = text ? JSON.parse(text) : {};
    } catch (parseError) {
      console.error('❌ Failed to parse response. Status:', response.status);
      console.error('Response text:', text);
      throw parseError;
    }

    if (!response.ok) {
      console.error(`❌ Error (Status ${response.status}):`, data);
      process.exit(1);
    }

    console.log('✅ Cron job completed successfully:');
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Failed to run cron job:', error);
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
        console.error('💡 Make sure your Next.js server is running (pnpm dev)');
      }
    }
    process.exit(1);
  }
}

runCron();
