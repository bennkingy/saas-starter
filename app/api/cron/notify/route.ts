import { NextResponse } from "next/server";
import { NOTIFICATIONS_CONFIG } from "@/lib/config/notifications";
import { notifySubscribersOfNewArrivals } from "@/lib/notifications/notifier";
import { db } from "@/lib/db/drizzle";
import { products } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";

export const runtime = "nodejs";

async function runNotificationJob(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  
  console.log(`[notify] Checking authorization...`);
  console.log(`[notify] CRON_SECRET present: ${!!cronSecret}`);
  console.log(`[notify] CRON_SECRET length: ${cronSecret?.length || 0}`);
  
  const authHeader = request.headers.get("authorization");
  const authHeaderValue = authHeader ? (authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader) : null;
  const isVercelCron = authHeader?.startsWith("Bearer ") && 
    authHeader.slice(7) === cronSecret;
  
  const providedSecret = request.headers.get(
    NOTIFICATIONS_CONFIG.cron.headerName
  );

  console.log(`[notify] Auth check:`, {
    hasAuthHeader: !!authHeader,
    authHeaderPrefix: authHeader?.substring(0, 20) || "none",
    authHeaderValueLength: authHeaderValue?.length || 0,
    authHeaderMatches: authHeaderValue === cronSecret,
    isVercelCron,
    hasProvidedSecret: !!providedSecret,
    providedSecretLength: providedSecret?.length || 0,
    providedSecretMatches: providedSecret === cronSecret,
  });

  const isAuthorized =
    isVercelCron || (cronSecret && providedSecret === cronSecret);

  if (!isAuthorized) {
    console.error(`[notify] ❌ Unauthorized request`);
    console.error(`[notify] Auth details:`, {
      authHeader: authHeader ? "present" : "missing",
      isVercelCron,
      providedSecret: providedSecret ? "present" : "missing",
      cronSecret: cronSecret ? "present" : "missing",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  console.log(`[notify] ✅ Authorization successful`);

  try {
    const body = await request.json();
    const { productIds } = body as { productIds: number[] };

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid request: productIds required" },
        { status: 400 }
      );
    }

    console.log(`[notify] Processing notification job for ${productIds.length} products`);

    const dbProducts = await db
      .select()
      .from(products)
      .where(inArray(products.id, productIds));

    if (dbProducts.length === 0) {
      console.log(`[notify] No products found for IDs: ${productIds}`);
      return NextResponse.json({
        productsFound: 0,
        notified: 0,
      });
    }

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

    return NextResponse.json({
      productsFound: dbProducts.length,
      notified: notifiedProductIds.length,
      notifiedProductIds,
    });
  } catch (error) {
    console.error("[notify] ❌ Error in notification job:", error);
    return NextResponse.json(
      {
        error: "Failed to process notifications",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  console.log(`[notify] POST endpoint called`);
  console.log(`[notify] Request URL: ${request.url}`);
  console.log(`[notify] Request headers:`, {
    authorization: request.headers.get("authorization") ? "present" : "missing",
    contentType: request.headers.get("content-type"),
  });
  
  try {
    const result = await runNotificationJob(request);
    console.log(`[notify] ✅ Notification job completed successfully`);
    return result;
  } catch (error) {
    console.error(`[notify] ❌ Unhandled error in POST handler:`, error);
    throw error;
  }
}
