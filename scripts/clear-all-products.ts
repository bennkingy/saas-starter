import { db } from '../lib/db/drizzle';
import { products, stockEvents, scraperState } from '../lib/db/schema';

async function main() {
  console.log('Clearing all products and related data...');

  // Delete stock events first (foreign key constraint)
  const deletedEvents = await db.delete(stockEvents).returning({ id: stockEvents.id });
  console.log(`Deleted ${deletedEvents.length} stock events.`);

  // Delete all products
  const deletedProducts = await db.delete(products).returning({ id: products.id });
  console.log(`Deleted ${deletedProducts.length} products.`);

  // Clear scraper state (ETag/Last-Modified) so we fetch fresh
  await db.delete(scraperState);
  console.log('Cleared scraper state (will fetch fresh data on next run).');

  console.log('✅ All products cleared! The next cron run will detect all products as new arrivals.');
}

main().catch((error) => {
  console.error('Failed to clear products:', error);
  process.exit(1);
});
