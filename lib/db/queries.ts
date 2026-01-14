import { desc, and, eq, isNull, isNotNull, sql, count, gte } from "drizzle-orm";
import { db } from "./drizzle";
import {
  activityLogs,
  notificationPreferences,
  products,
  teamMembers,
  teams,
  users,
} from "./schema";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/session";

export async function getUser() {
  const sessionCookie = (await cookies()).get("session");
  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  const sessionData = await verifyToken(sessionCookie.value);
  if (
    !sessionData ||
    !sessionData.user ||
    typeof sessionData.user.id !== "number"
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
      updatedAt: new Date(),
    })
    .where(eq(teams.id, teamId));
}

export async function getUserWithTeam(userId: number) {
  const result = await db
    .select({
      user: users,
      teamId: teamMembers.teamId,
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
    throw new Error("User not authenticated");
  }

  return await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      timestamp: activityLogs.timestamp,
      ipAddress: activityLogs.ipAddress,
      userName: users.name,
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
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return result?.team || null;
}

export async function getNotificationPreferencesForUser() {
  const user = await getUser();
  if (!user) {
    throw new Error("User not authenticated");
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
  emailEnabled: boolean;
  smsEnabled: boolean;
  phoneNumber: string | null;
}) {
  const user = await getUser();
  if (!user) {
    throw new Error("User not authenticated");
  }

  await getNotificationPreferencesForUser();

  const updated = await db
    .update(notificationPreferences)
    .set({
      emailEnabled: input.emailEnabled,
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
  return await db
    .select()
    .from(products)
    .where(isNotNull(products.lastCheckedAt))
    .orderBy(desc(products.lastCheckedAt))
    .limit(limit);
}

/**
 * Get all products for display, grouped by createdAt (when first detected).
 */
export async function getAllProductItems(limit = 80) {
  return await db
    .select({
      id: products.id,
      name: products.name,
      url: products.url,
      imageUrl: products.imageUrl,
      createdDate: products.createdAt,
      lastCheckedAt: products.lastCheckedAt,
    })
    .from(products)
    .where(isNotNull(products.lastCheckedAt))
    .orderBy(desc(products.createdAt))
    .limit(limit);
}

/**
 * Get recent new arrival products.
 * Returns the most recently created products.
 */
export async function getRecentNewArrivals(limit = 40) {
  return await db
    .select({
      id: products.id,
      detectedAt: products.createdAt,
      notifiedAt: products.notifiedAt,
      productId: products.id,
      productName: products.name,
      productUrl: products.url,
      productImageUrl: products.imageUrl,
    })
    .from(products)
    .where(isNotNull(products.lastCheckedAt))
    .orderBy(desc(products.createdAt))
    .limit(limit);
}

/**
 * Admin queries for dashboard statistics
 */
export async function getAdminStats() {
  const user = await getUser();
  if (!user || user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }

  // Get total users (not deleted)
  const totalUsers = await db
    .select({ count: count() })
    .from(users)
    .where(isNull(users.deletedAt));

  // Get pro users (users with active pro subscriptions)
  const proUserIds = await db
    .select({ userId: teamMembers.userId })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(
      and(
        eq(teams.planName, "Pro"),
        sql`${teams.subscriptionStatus} IN ('active', 'trialing')`
      )
    );

  const proUserIdsSet = new Set(
    proUserIds.map((r) => r.userId).filter(Boolean)
  );

  // Get free users (total users minus pro users)
  const allUserIds = await db
    .select({ id: users.id })
    .from(users)
    .where(isNull(users.deletedAt));

  const freeUsersCount = allUserIds.filter(
    (u) => !proUserIdsSet.has(u.id)
  ).length;

  const proUsersCount = proUserIdsSet.size;

  // Get pro signups over time (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const proSignups = await db
    .select({
      date: sql<string>`${teams.createdAt}::date::text`,
      count: count(),
    })
    .from(teams)
    .where(
      and(
        gte(teams.createdAt, thirtyDaysAgo),
        eq(teams.planName, "Pro"),
        sql`${teams.subscriptionStatus} IN ('active', 'trialing')`
      )
    )
    .groupBy(sql`${teams.createdAt}::date`)
    .orderBy(sql`${teams.createdAt}::date`);

  // Get user signups over time (last 30 days)
  const userSignups = await db
    .select({
      date: sql<string>`${users.createdAt}::date::text`,
      count: count(),
    })
    .from(users)
    .where(and(isNull(users.deletedAt), gte(users.createdAt, thirtyDaysAgo)))
    .groupBy(sql`${users.createdAt}::date`)
    .orderBy(sql`${users.createdAt}::date`);

  return {
    totalUsers: totalUsers[0]?.count ?? 0,
    freeUsers: freeUsersCount,
    proUsers: proUsersCount,
    proSignups: proSignups.map((s) => ({
      date: s.date,
      count: Number(s.count),
    })),
    userSignups: userSignups.map((s) => ({
      date: s.date,
      count: Number(s.count),
    })),
  };
}
