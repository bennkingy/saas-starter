import 'server-only';

import { inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { products } from '@/lib/db/schema';
import type { NewProduct, NewProductsSnapshot } from '@/lib/stock/fetcher';
import { MAX_TRACKED_PRODUCTS } from '@/lib/config/products';

export type NewArrivalDetected = {
  productId: number;
  externalId: string;
  name: string;
  url: string;
  imageUrl?: string | null;
  detectedAt: Date;
};

/**
 * New arrival detection rules:
 * - We store the products we've seen from the /new page
 * - If a product appears that we haven't seen before, it's a NEW ARRIVAL
 * - We alert everyone when new products appear on the /new page
 * - Position changes don't trigger alerts - only truly new products do
 */
export async function syncProductsAndDetectNewArrivals(snapshot: NewProductsSnapshot) {
  const topProducts = snapshot.products.slice(0, MAX_TRACKED_PRODUCTS);
  
  if (topProducts.length === 0) {
    return { newArrivals: [] as NewArrivalDetected[] };
  }

  const externalIds = topProducts.map((p) => p.externalId);
  const now = snapshot.fetchedAt;

  return await db.transaction(async (tx) => {
    // Get all products we've seen before
    const existing = await tx
      .select()
      .from(products)
      .where(inArray(products.externalId, externalIds));

    const existingByExternalId = new Set(existing.map((p) => p.externalId));

    // Find products that are completely new (never seen before)
    const newProducts = topProducts.filter(
      (product) => !existingByExternalId.has(product.externalId)
    );

    // Upsert all current products to keep our snapshot fresh
    await tx
      .insert(products)
      .values(
        topProducts.map((product) => ({
          externalId: product.externalId,
          name: product.name,
          url: product.url,
          imageUrl: product.imageUrl,
          // Legacy field: we currently treat "present on /new" as "available".
          // We are NOT tracking per-product restocks here—only new arrivals.
          lastKnownStock: true,
          lastCheckedAt: now,
          updatedAt: now,
        }))
      )
      .onConflictDoUpdate({
        target: products.externalId,
        set: {
          name: sql`excluded.name`,
          url: sql`excluded.url`,
          imageUrl: sql`excluded.image_url`,
          lastKnownStock: sql`excluded.last_known_stock`,
          lastCheckedAt: sql`excluded.last_checked_at`,
          updatedAt: sql`excluded.updated_at`,
        },
      });

    if (newProducts.length === 0) {
      return { newArrivals: [] as NewArrivalDetected[] };
    }

    // Get the inserted product IDs for the new products
    const insertedProducts = await tx
      .select()
      .from(products)
      .where(inArray(products.externalId, newProducts.map((p) => p.externalId)));

    // Build the new arrivals response using products directly
    const newArrivals = insertedProducts.map((dbProduct) => {
      const snapshotProduct = newProducts.find(
        (p) => p.externalId === dbProduct.externalId
      );

      if (!snapshotProduct) {
        throw new Error(
          `Internal error: no snapshot product found for externalId=${dbProduct.externalId}`
        );
      }

      return {
        productId: dbProduct.id,
        externalId: dbProduct.externalId,
        name: dbProduct.name,
        url: dbProduct.url,
        imageUrl: dbProduct.imageUrl ?? null,
        detectedAt: dbProduct.createdAt,
      };
    });

    return { newArrivals };
  });
}
