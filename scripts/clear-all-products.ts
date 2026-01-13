import { db } from "../lib/db/drizzle";
import { products, scraperState } from "../lib/db/schema";

async function main() {
  console.log("Clearing all products and related data...");

  // Delete all products
  const deletedProducts = await db
    .delete(products)
    .returning({ id: products.id });
  console.log(`Deleted ${deletedProducts.length} products.`);

  // Clear scraper state (ETag/Last-Modified) so we fetch fresh
  await db.delete(scraperState);
  console.log("Cleared scraper state (will fetch fresh data on next run).");

  console.log(
    "✅ All products cleared! The next cron run will detect all products as new arrivals."
  );
}

main().catch((error) => {
  console.error("Failed to clear products:", error);
  process.exit(1);
});
