import { NextResponse } from "next/server";
import { NOTIFICATIONS_CONFIG } from "@/lib/config/notifications";
import { fetchNewProductsSnapshot } from "@/lib/stock/fetcher";
import { syncProductsAndDetectNewArrivals } from "@/lib/stock/differ";
import { notifySubscribersOfNewArrivals } from "@/lib/notifications/notifier";
import { client } from "@/lib/db/drizzle";

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
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";
  const cronSecret = process.env.CRON_SECRET;
  const providedSecret = request.headers.get(
    NOTIFICATIONS_CONFIG.cron.headerName
  );

  // In production on Vercel, require the x-vercel-cron header
  // In local/dev, allow secret-based auth as fallback
  const isAuthorized =
    isVercelCron || (cronSecret && providedSecret === cronSecret);

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lockAcquired = await tryAcquireCronLock();
  if (!lockAcquired) {
    return NextResponse.json(
      { skipped: true, reason: "lock-not-acquired" },
      { status: 409 }
    );
  }

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
      return NextResponse.json({
        productsFound: snapshot.products.length,
        newArrivalsDetected: 0,
        productsNotified: 0,
      });
    }

    console.log(
      `[cron] Calling notifier with ${newArrivals.length} new arrivals`
    );
    try {
      const { notifiedProductIds } = await notifySubscribersOfNewArrivals({
        newArrivals,
      });
      console.log(
        `[cron] Notifier returned ${notifiedProductIds.length} notified product IDs`
      );
      console.log(`[cron] Notified product IDs:`, notifiedProductIds);

      return NextResponse.json({
        productsFound: snapshot.products.length,
        newArrivalsDetected: newArrivals.length,
        productsNotified: notifiedProductIds.length,
      });
    } catch (error) {
      console.error("[cron] ❌ Error in notifier:", error);
      console.error(
        "[cron] Error stack:",
        error instanceof Error ? error.stack : "No stack trace"
      );
      return NextResponse.json(
        {
          error: "Failed to send notifications",
          details: error instanceof Error ? error.message : String(error),
          productsFound: snapshot.products.length,
          newArrivalsDetected: newArrivals.length,
          productsNotified: 0,
        },
        { status: 500 }
      );
    }
  } finally {
    await releaseCronLock();
  }
}

export async function GET(request: Request) {
  return await runNewArrivalsCheck(request);
}

export async function POST(request: Request) {
  return await runNewArrivalsCheck(request);
}
