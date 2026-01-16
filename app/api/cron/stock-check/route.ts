import { NextResponse } from "next/server";
import { NOTIFICATIONS_CONFIG } from "@/lib/config/notifications";
import { fetchNewProductsSnapshot } from "@/lib/stock/fetcher";
import { syncProductsAndDetectNewArrivals } from "@/lib/stock/differ";
import { client } from "@/lib/db/drizzle";
import { notifySubscribersOfNewArrivals } from "@/lib/notifications/notifier";
import { db } from "@/lib/db/drizzle";
import { products } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";

export const runtime = "nodejs";

const CRON_LOCK_KEY = "jellycatsalerts:cron:stock-check";

async function tryAcquireCronLock() {
  const rows = await client<
    {
      locked: boolean;
    }[]
  >`select pg_try_advisory_lock(hashtext(${CRON_LOCK_KEY})) as locked`;

  return rows?.[0]?.locked === true;
}

async function releaseCronLock() {
  await client`select pg_advisory_unlock(hashtext(${CRON_LOCK_KEY}))`;
}

async function runNewArrivalsCheck(request: Request) {
  const url = new URL(request.url);
  const isDryRun = url.searchParams.get("dryRun") === "1";

  // Verify request is from Vercel Cron (production) or has valid secret (local/dev)
  const cronSecret = process.env.CRON_SECRET;
  
  // Vercel Cron sends authorization header with bearer token matching CRON_SECRET
  const authHeader = request.headers.get("authorization");
  const isVercelCron = authHeader?.startsWith("Bearer ") && 
    authHeader.slice(7) === cronSecret;
  
  // Fallback for local/dev: check custom header
  const providedSecret = request.headers.get(
    NOTIFICATIONS_CONFIG.cron.headerName
  );

  // In production on Vercel, require the authorization bearer token
  // In local/dev, allow secret-based auth as fallback
  const isAuthorized =
    isVercelCron || (cronSecret && providedSecret === cronSecret);

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lockAcquired = await tryAcquireCronLock();
  if (!lockAcquired) {
    console.log("[cron] ⚠️ Lock not acquired - previous run may still be executing");
    return NextResponse.json(
      { skipped: true, reason: "lock-not-acquired" },
      { status: 409 }
    );
  }

  const startTime = Date.now();
  try {
    /**
     * Expected schedule: once per minute (or as desired).
     *
     * Flow:
     * - Fetch the /new page from Jellycat
     * - Compare against previously seen products
     * - If new products appear, add the product to the database and notify all subscribers
     */
    console.log("[cron] Fetching new products snapshot...");
    const snapshot = await fetchNewProductsSnapshot();

    if (snapshot.notModified) {
      console.log("[cron] Snapshot not modified (304)");
      await releaseCronLock();
      return NextResponse.json({
        notModified: true,
        productsFound: 0,
        newArrivalsDetected: 0,
        productsNotified: 0,
      });
    }

    console.log(
      `[cron] Found ${snapshot.products.length} products in snapshot`
    );
    const { newArrivals } = await syncProductsAndDetectNewArrivals(snapshot);
    console.log(`[cron] Detected ${newArrivals.length} new arrivals`);
    if (newArrivals.length > 0) {
      console.log(
        `[cron] New arrivals details:`,
        newArrivals.map((a) => ({ id: a.productId, name: a.name }))
      );
    }

    if (isDryRun) {
      console.log("[cron] Dry run mode - skipping notifications");
      await releaseCronLock();
      return NextResponse.json({
        dryRun: true,
        productsFound: snapshot.products.length,
        products: snapshot.products,
        newArrivalsDetected: newArrivals.length,
        newArrivals,
        productsNotified: 0,
      });
    }

    if (newArrivals.length === 0) {
      console.log("[cron] No new arrivals to notify");
      await releaseCronLock();
      return NextResponse.json({
        productsFound: snapshot.products.length,
        newArrivalsDetected: 0,
        productsNotified: 0,
      });
    }

    // Prepare response data
    const productIds = newArrivals.map((a) => a.productId);
    const responseData = {
      productsFound: snapshot.products.length,
      newArrivalsDetected: newArrivals.length,
      productsNotified: 0,
      notificationJobTriggered: productIds.length > 0,
    };

    // Release lock BEFORE notifications (so next cron can run even if notifications are still processing)
    const executionTime = Date.now() - startTime;
    console.log(`[cron] ⏱️ Main job completed in ${executionTime}ms, releasing lock...`);
    await releaseCronLock();
    console.log(`[cron] ✅ Lock released`);

    // NOW trigger notifications (outside the lock, fire-and-forget)
    if (productIds.length > 0) {
      console.log(
        `[cron] Triggering notification job for ${productIds.length} new arrivals`
      );
      console.log(`[cron] Product IDs to notify:`, productIds);
      
      // Use setImmediate to ensure this runs after the response is sent
      setImmediate(async () => {
        try {
          console.log(`[cron] [async] Starting notification job...`);
          console.log(`[cron] [async] Fetching products from database...`);
          const dbProducts = await db
            .select()
            .from(products)
            .where(inArray(products.id, productIds));

          if (dbProducts.length === 0) {
            console.log(`[cron] [async] No products found for IDs: ${productIds}`);
            return;
          }

          console.log(`[cron] [async] Found ${dbProducts.length} products, preparing notifications...`);
          const newArrivals = dbProducts.map((p) => ({
            productId: p.id,
            externalId: p.externalId,
            name: p.name,
            url: p.url,
            imageUrl: p.imageUrl ?? null,
            detectedAt: p.createdAt,
          }));

          const { notifiedProductIds } = await notifySubscribersOfNewArrivals({
            newArrivals,
          });

          console.log(
            `[cron] [async] ✅ Notification job completed: ${notifiedProductIds.length} products notified`
          );
        } catch (error) {
          console.error("[cron] [async] ❌ Failed to process notification job:", error);
          console.error("[cron] [async] Error details:", {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            name: error instanceof Error ? error.name : undefined,
          });
        }
      });
    }

    return NextResponse.json(responseData);
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`[cron] ❌ Error in cron job after ${executionTime}ms:`, error);
    await releaseCronLock();
    throw error;
  }
}

export async function GET(request: Request) {
  return await runNewArrivalsCheck(request);
}

export async function POST(request: Request) {
  return await runNewArrivalsCheck(request);
}
