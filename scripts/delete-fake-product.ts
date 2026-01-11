import { eq, inArray } from 'drizzle-orm';
import { db } from '../lib/db/drizzle';
import { products, stockEvents } from '../lib/db/schema';

const TARGET_PRODUCT_NAME = 'Bashful Bunny (Medium)';

async function main() {
  const matchingProducts = await db
    .select({
      id: products.id,
      externalId: products.externalId,
      url: products.url,
    })
    .from(products)
    .where(eq(products.name, TARGET_PRODUCT_NAME));

  if (matchingProducts.length === 0) {
    console.log(`No products found with name: "${TARGET_PRODUCT_NAME}"`);
    return;
  }

  const productIds = matchingProducts.map((product) => product.id);

  const deletedEvents = await db
    .delete(stockEvents)
    .where(inArray(stockEvents.productId, productIds))
    .returning({ id: stockEvents.id });

  const deletedProducts = await db
    .delete(products)
    .where(eq(products.name, TARGET_PRODUCT_NAME))
    .returning({ id: products.id, externalId: products.externalId, url: products.url });

  console.log(`Deleted ${deletedEvents.length} stock events.`);
  console.log(`Deleted ${deletedProducts.length} products named "${TARGET_PRODUCT_NAME}".`);
}

main().catch((error) => {
  console.error('Failed to delete fake product:', error);
  process.exit(1);
});

