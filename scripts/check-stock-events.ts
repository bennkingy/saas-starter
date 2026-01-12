import { db } from '../lib/db/drizzle';
import { stockEvents, products } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const allEvents = await db
    .select({
      id: stockEvents.id,
      productId: stockEvents.productId,
      detectedAt: stockEvents.detectedAt,
      notifiedAt: stockEvents.notifiedAt,
      productName: products.name,
    })
    .from(stockEvents)
    .innerJoin(products, eq(products.id, stockEvents.productId));

  // Sort by detectedAt descending (newest first)
  allEvents.sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());

  console.log(`\n📬 Total stock events: ${allEvents.length}`);
  
  const pending = allEvents.filter((e) => e.notifiedAt === null);
  const notified = allEvents.filter((e) => e.notifiedAt !== null);

  console.log(`   - Pending (notifiedAt = null): ${pending.length}`);
  console.log(`   - Notified (notifiedAt set): ${notified.length}`);

  if (allEvents.length > 0) {
    console.log('\n📋 Recent events:');
    allEvents.slice(-10).forEach((e) => {
      const status = e.notifiedAt ? '✅ Notified' : '⏳ Pending';
      console.log(`   ${status} - Event #${e.id} - ${e.productName}`);
      console.log(`      Detected: ${e.detectedAt}`);
      if (e.notifiedAt) {
        console.log(`      Notified: ${e.notifiedAt}`);
      }
    });
  }
}

main().catch((error) => {
  console.error('Failed to check events:', error);
  process.exit(1);
});
