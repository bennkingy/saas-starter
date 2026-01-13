import { db } from "../lib/db/drizzle";
import { products } from "../lib/db/schema";
import { and, isNotNull } from "drizzle-orm";

async function main() {
  // First, check current state
  const allProducts = await db
    .select()
    .from(products)
    .where(isNotNull(products.lastCheckedAt));
  const notifiedProducts = allProducts.filter((p) => p.notifiedAt !== null);

  console.log(`📦 Found ${allProducts.length} total products`);
  console.log(`   - ${notifiedProducts.length} with notifiedAt set`);
  console.log(
    `   - ${
      allProducts.length - notifiedProducts.length
    } with notifiedAt = null`
  );

  if (notifiedProducts.length === 0) {
    console.log(
      "\n✅ No products to reset (all already have notifiedAt = null)"
    );
    return;
  }

  console.log("\n🔄 Resetting notifiedAt for all products...");

  const result = await db
    .update(products)
    .set({ notifiedAt: null })
    .where(
      and(isNotNull(products.notifiedAt), isNotNull(products.lastCheckedAt))
    )
    .returning({ id: products.id });

  console.log(
    `✅ Reset ${result.length} products. They will be notified again on next cron run.`
  );
}

main().catch((error) => {
  console.error("Failed to reset events:", error);
  process.exit(1);
});
