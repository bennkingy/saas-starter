import { NextResponse } from "next/server";
import { NOTIFICATIONS_CONFIG } from "@/lib/config/notifications";
import { notifySubscribersOfNewArrivals } from "@/lib/notifications/notifier";
import { db } from "@/lib/db/drizzle";
import { products } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";

export const runtime = "nodejs";

async function runNotificationJob(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  
  const authHeader = request.headers.get("authorization");
  const isVercelCron = authHeader?.startsWith("Bearer ") && 
    authHeader.slice(7) === cronSecret;
  
  const providedSecret = request.headers.get(
    NOTIFICATIONS_CONFIG.cron.headerName
  );

  const isAuthorized =
    isVercelCron || (cronSecret && providedSecret === cronSecret);

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  return await runNotificationJob(request);
}
