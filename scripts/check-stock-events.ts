import { db } from '../lib/db/drizzle';
import { products } from '../lib/db/schema';
import { isNotNull } from 'drizzle-orm';

async function main() {
  const allProducts = await db
    .select({
      id: products.id,
      name: products.name,
      createdAt: products.createdAt,
      notifiedAt: products.notifiedAt,
    })
    .from(products)
    .where(isNotNull(products.lastCheckedAt));

  // Sort by createdAt descending (newest first)
  allProducts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  console.log(`\n📦 Total products: ${allProducts.length}`);
  
  const pending = allProducts.filter((p) => p.notifiedAt === null);
  const notified = allProducts.filter((p) => p.notifiedAt !== null);

  console.log(`   - Pending (notifiedAt = null): ${pending.length}`);
  console.log(`   - Notified (notifiedAt set): ${notified.length}`);

  if (allProducts.length > 0) {
    console.log('\n📋 Recent products:');
    allProducts.slice(0, 10).forEach((p) => {
      const status = p.notifiedAt ? '✅ Notified' : '⏳ Pending';
      console.log(`   ${status} - Product #${p.id} - ${p.name}`);
      console.log(`      Created: ${p.createdAt}`);
      if (p.notifiedAt) {
        console.log(`      Notified: ${p.notifiedAt}`);
      }
    });
  }
}

main().catch((error) => {
  console.error('Failed to check events:', error);
  process.exit(1);
});
