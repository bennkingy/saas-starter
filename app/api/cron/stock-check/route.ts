import { NextResponse } from "next/server";
import { NOTIFICATIONS_CONFIG } from "@/lib/config/notifications";
import { fetchNewProductsSnapshot } from "@/lib/stock/fetcher";
import { syncProductsAndDetectNewArrivals } from "@/lib/stock/differ";
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

    // Trigger notifications asynchronously (fire-and-forget)
    const productIds = newArrivals.map((a) => a.productId);
    console.log(
      `[cron] Triggering async notification job for ${productIds.length} new arrivals`
    );
    
    // For internal API calls in Vercel, construct URL from request origin
    // This ensures the call stays within the same deployment and bypasses Vercel's edge protection
    const requestUrl = new URL(request.url);
    const notifyUrl = `${requestUrl.origin}/api/cron/notify`;
    
    console.log(`[cron] Notification URL: ${notifyUrl}`);
    console.log(`[cron] Request origin: ${requestUrl.origin}`);
    console.log(`[cron] Product IDs to notify:`, productIds);
    console.log(`[cron] CRON_SECRET present: ${!!cronSecret}`);
    
    // Use fetch with proper error handling and logging
    // Send both Authorization header (for Vercel Cron compatibility) and x-cron-secret header (for internal calls)
    fetch(notifyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cronSecret}`,
        [NOTIFICATIONS_CONFIG.cron.headerName]: cronSecret || "",
      },
      body: JSON.stringify({ productIds }),
    })
      .then(async (response) => {
        const responseText = await response.text();
        if (!response.ok) {
          console.error(
            `[cron] ❌ Notification job failed with status ${response.status}:`,
            responseText
          );
        } else {
          console.log(
            `[cron] ✅ Notification job triggered successfully:`,
            responseText
          );
        }
      })
      .catch((error) => {
        console.error("[cron] ❌ Failed to trigger notification job:", error);
        console.error("[cron] Error details:", {
          message: error.message,
          stack: error.stack,
          name: error.name,
        });
      });

    return NextResponse.json({
      productsFound: snapshot.products.length,
      newArrivalsDetected: newArrivals.length,
      productsNotified: 0,
      notificationJobTriggered: true,
    });
  } finally {
    const executionTime = Date.now() - startTime;
    console.log(`[cron] ⏱️ Execution completed in ${executionTime}ms`);
    await releaseCronLock();
  }
}

export async function GET(request: Request) {
  return await runNewArrivalsCheck(request);
}

export async function POST(request: Request) {
  return await runNewArrivalsCheck(request);
}
