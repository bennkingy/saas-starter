import { NextResponse } from 'next/server';
import { NOTIFICATIONS_CONFIG } from '@/lib/config/notifications';
import { fetchNewProductsSnapshot } from '@/lib/stock/fetcher';
import { syncProductsAndDetectNewArrivals } from '@/lib/stock/differ';
import { notifySubscribersOfNewArrivals } from '@/lib/notifications/notifier';
import { client } from '@/lib/db/drizzle';

export const runtime = 'nodejs';

const CRON_LOCK_KEY = 'jellycatsalerts:cron:stock-check';

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
  const isDryRun = url.searchParams.get('dryRun') === '1';

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: 'Server misconfigured: CRON_SECRET is not set.' },
      { status: 500 }
    );
  }

  const providedSecret = request.headers.get(NOTIFICATIONS_CONFIG.cron.headerName);
  if (providedSecret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const lockAcquired = await tryAcquireCronLock();
  if (!lockAcquired) {
    return NextResponse.json(
      { skipped: true, reason: 'lock-not-acquired' },
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
   * - If new products appear, create stock events and notify all subscribers
   */
  const snapshot = await fetchNewProductsSnapshot();

  if (snapshot.notModified) {
    return NextResponse.json({
      notModified: true,
      productsFound: 0,
      newArrivalsDetected: 0,
      eventsNotified: 0,
    });
  }

  const { newArrivals } = await syncProductsAndDetectNewArrivals(snapshot);
  
  if (isDryRun) {
    return NextResponse.json({
      dryRun: true,
      productsFound: snapshot.products.length,
      products: snapshot.products,
      newArrivalsDetected: newArrivals.length,
      newArrivals,
      eventsNotified: 0,
    });
  }

  const { notifiedEventIds } = await notifySubscribersOfNewArrivals({ newArrivals });

  return NextResponse.json({
    productsFound: snapshot.products.length,
    newArrivalsDetected: newArrivals.length,
    eventsNotified: notifiedEventIds.length,
  });
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
