import "server-only";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/lib/db/drizzle";
import {
  notificationPreferences,
  products,
  teamMembers,
  teams,
  users,
} from "@/lib/db/schema";
import type { NewArrivalDetected } from "@/lib/stock/differ";
import { sendNewArrivalEmail } from "@/lib/notifications/email";
import { createSmsProviderFromEnv } from "@/lib/notifications/sms";
import { canUseSMS } from "@/lib/subscriptions/guards";

type NotifyArgs = {
  newArrivals: NewArrivalDetected[];
};

export async function notifySubscribersOfNewArrivals({
  newArrivals,
}: NotifyArgs) {
  console.log(
    `[notifier] Starting notification process for ${newArrivals.length} new arrivals`
  );

  if (newArrivals.length === 0) {
    console.log("[notifier] No new arrivals to notify");
    return { notifiedProductIds: [] as number[] };
  }

  const productIds = newArrivals.map((r) => r.productId);
  console.log(
    `[notifier] Checking ${productIds.length} product IDs for pending notifications`
  );

  /**
   * Idempotency: only notify products that haven't been marked notified yet.
   * We mark `notifiedAt` only after all notifications succeed.
   */
  const pendingProducts = await db
    .select({ id: products.id })
    .from(products)
    .where(and(inArray(products.id, productIds), isNull(products.notifiedAt)));

  console.log(
    `[notifier] Found ${pendingProducts.length} pending products (${
      productIds.length - pendingProducts.length
    } already notified)`
  );

  const pendingProductIdSet = new Set(pendingProducts.map((p) => p.id));
  const pendingArrivals = newArrivals.filter((r) =>
    pendingProductIdSet.has(r.productId)
  );

  if (pendingArrivals.length === 0) {
    console.log(
      "[notifier] No pending arrivals to notify (all already notified)"
    );
    return { notifiedProductIds: [] as number[] };
  }

  console.log(
    `[notifier] Processing ${pendingArrivals.length} pending arrivals`
  );

  /**
   * Get all users with notification preferences.
   * Email alerts are free and don't require team membership.
   * Team/subscription info is only needed for SMS (Pro plan).
   */
  const recipients = await db
    .select({
      userId: users.id,
      email: users.email,
      teamSubscriptionStatus: teams.subscriptionStatus,
      teamPlanName: teams.planName,
      emailEnabled: notificationPreferences.emailEnabled,
      smsEnabled: notificationPreferences.smsEnabled,
      phoneNumber: notificationPreferences.phoneNumber,
    })
    .from(notificationPreferences)
    .innerJoin(users, eq(users.id, notificationPreferences.userId))
    .leftJoin(teamMembers, eq(teamMembers.userId, users.id))
    .leftJoin(teams, eq(teams.id, teamMembers.teamId));

  console.log(
    `[notifier] Found ${recipients.length} recipients with notification preferences`
  );

  // Filter recipients: email enabled (defaults to true), or SMS enabled with valid setup
  const activeRecipients = recipients.filter((r) => {
    const emailEnabled = r.emailEnabled ?? true;
    return emailEnabled;
  });

  console.log(
    `[notifier] ${activeRecipients.length} active recipients (email enabled)`
  );
  activeRecipients.forEach((r) => {
    console.log(
      `[notifier]   - ${r.email} (emailEnabled: ${r.emailEnabled ?? true})`
    );
  });

  if (activeRecipients.length === 0) {
    console.log(
      "[notifier] No active recipients found - skipping notifications"
    );
    return { notifiedProductIds: [] as number[] };
  }

  const smsProvider = createSmsProviderFromEnv();

  const totalNotifications = activeRecipients.length * pendingArrivals.length;
  console.log(
    `[notifier] Sending ${totalNotifications} email notifications...`
  );

  /**
   * Send notifications to ALL active subscribers for each new arrival.
   * Everyone gets alerted - no per-user product selection needed.
   * Use allSettled so individual failures don't stop the whole process.
   */
  const results = await Promise.allSettled(
    activeRecipients.flatMap((recipient) =>
      pendingArrivals.flatMap((arrival) => {
        const emailEnabled = recipient.emailEnabled ?? true;
        const smsEnabled = recipient.smsEnabled ?? false;

        const emailPromise = emailEnabled
          ? sendNewArrivalEmail({
              to: recipient.email,
              productName: arrival.name,
              productUrl: arrival.url,
              imageUrl: arrival.imageUrl,
            })
              .then(() => {
                console.log(
                  `[notifier] ✅ Email sent to ${recipient.email} for ${arrival.name}`
                );
              })
              .catch((error) => {
                console.error(
                  `[notifier] ❌ Failed to send email to ${recipient.email} for ${arrival.name}:`,
                  error
                );
                throw error;
              })
          : Promise.resolve();

        const canSendSms =
          smsEnabled &&
          Boolean(recipient.phoneNumber) &&
          canUseSMS({
            subscriptionStatus: recipient.teamSubscriptionStatus ?? null,
            planName: recipient.teamPlanName ?? null,
          });

        const smsPromise = canSendSms
          ? smsProvider
              .send({
                to: recipient.phoneNumber as string,
                body: `🎉 New Jellycat: ${arrival.name} - ${arrival.url}`,
              })
              .catch((error) => {
                console.error(
                  `[notifier] Failed to send SMS to ${recipient.phoneNumber}:`,
                  error
                );
                throw error;
              })
          : Promise.resolve();

        return [emailPromise, smsPromise];
      })
    )
  );

  const successful = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;
  console.log(
    `[notifier] Notification results: ${successful} succeeded, ${failed} failed`
  );

  // Mark products as notified even if some emails failed (we don't want to retry forever)
  const notifiedAt = new Date();
  const notifiedIds = pendingArrivals.map((r) => r.productId);

  await db
    .update(products)
    .set({ notifiedAt })
    .where(inArray(products.id, notifiedIds));

  console.log(
    `[notifier] ✅ Marked ${notifiedIds.length} products as notified`
  );

  return { notifiedProductIds: notifiedIds };
}
