import { db } from '../lib/db/drizzle';
import { stockEvents } from '../lib/db/schema';
import { isNotNull } from 'drizzle-orm';

async function main() {
  // First, check current state
  const allEvents = await db.select().from(stockEvents);
  const notifiedEvents = allEvents.filter((e) => e.notifiedAt !== null);
  
  console.log(`📬 Found ${allEvents.length} total stock events`);
  console.log(`   - ${notifiedEvents.length} with notifiedAt set`);
  console.log(`   - ${allEvents.length - notifiedEvents.length} with notifiedAt = null`);
  
  if (notifiedEvents.length === 0) {
    console.log('\n✅ No events to reset (all already have notifiedAt = null)');
    return;
  }
  
  console.log('\n🔄 Resetting notifiedAt for all stock events...');
  
  const result = await db
    .update(stockEvents)
    .set({ notifiedAt: null })
    .where(isNotNull(stockEvents.notifiedAt))
    .returning({ id: stockEvents.id });

  console.log(`✅ Reset ${result.length} stock events. They will be notified again on next cron run.`);
}

main().catch((error) => {
  console.error('Failed to reset events:', error);
  process.exit(1);
});
