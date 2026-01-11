import { desc, and, eq, isNull, isNotNull } from 'drizzle-orm';
import { db } from './drizzle';
import {
  activityLogs,
  notificationPreferences,
  products,
  stockEvents,
  teamMembers,
  teams,
  users,
} from './schema';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/session';

export async function getUser() {
  const sessionCookie = (await cookies()).get('session');
  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  const sessionData = await verifyToken(sessionCookie.value);
  if (
    !sessionData ||
    !sessionData.user ||
    typeof sessionData.user.id !== 'number'
  ) {
    return null;
  }

  if (new Date(sessionData.expires) < new Date()) {
    return null;
  }

  const user = await db
    .select()
    .from(users)
    .where(and(eq(users.id, sessionData.user.id), isNull(users.deletedAt)))
    .limit(1);

  if (user.length === 0) {
    return null;
  }

  return user[0];
}

export async function getTeamByStripeCustomerId(customerId: string) {
  const result = await db
    .select()
    .from(teams)
    .where(eq(teams.stripeCustomerId, customerId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateTeamSubscription(
  teamId: number,
  subscriptionData: {
    stripeSubscriptionId: string | null;
    stripeProductId: string | null;
    planName: string | null;
    subscriptionStatus: string;
    stripeCurrentPeriodEnd: Date | null;
  }
) {
  await db
    .update(teams)
    .set({
      ...subscriptionData,
      updatedAt: new Date()
    })
    .where(eq(teams.id, teamId));
}

export async function getUserWithTeam(userId: number) {
  const result = await db
    .select({
      user: users,
      teamId: teamMembers.teamId
    })
    .from(users)
    .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
    .where(eq(users.id, userId))
    .limit(1);

  return result[0];
}

export async function getActivityLogs() {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  return await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      timestamp: activityLogs.timestamp,
      ipAddress: activityLogs.ipAddress,
      userName: users.name
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .where(eq(activityLogs.userId, user.id))
    .orderBy(desc(activityLogs.timestamp))
    .limit(10);
}

export async function getTeamForUser() {
  const user = await getUser();
  if (!user) {
    return null;
  }

  const result = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, user.id),
    with: {
      team: {
        with: {
          teamMembers: {
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      }
    }
  });

  return result?.team || null;
}

export async function getNotificationPreferencesForUser() {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const existing = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, user.id))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const inserted = await db
    .insert(notificationPreferences)
    .values({ userId: user.id })
    .returning();

  return inserted[0];
}

export async function updateNotificationPreferencesForUser(input: {
  smsEnabled: boolean;
  phoneNumber: string | null;
}) {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  await getNotificationPreferencesForUser();

  const updated = await db
    .update(notificationPreferences)
    .set({
      // Email is required for the product. We keep it enabled.
      emailEnabled: true,
      smsEnabled: input.smsEnabled,
      phoneNumber: input.phoneNumber,
      updatedAt: new Date(),
    })
    .where(eq(notificationPreferences.userId, user.id))
    .returning();

  return updated[0];
}

/**
 * Get the latest products from the /new page snapshot.
 * These are the products we're currently monitoring.
 */
export async function getLatestProducts(limit = 40) {
  const [latestBatch] = await db
    .select({ lastCheckedAt: products.lastCheckedAt })
    .from(products)
    .where(isNotNull(products.lastCheckedAt))
    .orderBy(desc(products.lastCheckedAt))
    .limit(1);

  if (!latestBatch?.lastCheckedAt) return [];

  return await db
    .select()
    .from(products)
    .where(eq(products.lastCheckedAt, latestBatch.lastCheckedAt))
    .orderBy(desc(products.updatedAt), desc(products.createdAt))
    .limit(limit);
}

/**
 * Get recent new arrival events with product details.
 */
export async function getRecentNewArrivals(limit = 40) {
  return await db
    .select({
      id: stockEvents.id,
      detectedAt: stockEvents.detectedAt,
      notifiedAt: stockEvents.notifiedAt,
      productId: products.id,
      productName: products.name,
      productUrl: products.url,
      productImageUrl: products.imageUrl,
    })
    .from(stockEvents)
    .innerJoin(products, eq(stockEvents.productId, products.id))
    .orderBy(desc(stockEvents.detectedAt))
    .limit(limit);
}
