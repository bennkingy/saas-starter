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
import { formatProductName } from "@/lib/utils";

type NotifyArgs = {
  newArrivals: NewArrivalDetected[];
};

export async function notifySubscribersOfNewArrivals({
  newArrivals,
}: NotifyArgs) {
  console.log(`[notifier] ========================================`);
  console.log(`[notifier] notifySubscribersOfNewArrivals called`);
  console.log(`[notifier] New arrivals count: ${newArrivals.length}`);
  console.log(`[notifier] New arrivals:`, newArrivals.map(a => ({
    productId: a.productId,
    externalId: a.externalId,
    name: a.name,
  })));

  if (newArrivals.length === 0) {
    console.log("[notifier] No new arrivals to notify - exiting early");
    return { notifiedProductIds: [] as number[] };
  }

  const productIds = newArrivals.map((r) => r.productId);
  console.log(
    `[notifier] Checking ${productIds.length} product IDs for pending notifications:`,
    productIds
  );
  console.log(
    `[notifier] New arrivals details:`,
    newArrivals.map((a) => ({ id: a.productId, name: a.name }))
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
  console.log(
    `[notifier] Pending product IDs:`,
    pendingProducts.map((p) => p.id)
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
   * Start from users and left join preferences so users without preferences are still included.
   */
  console.log(`[notifier] Querying database for all users...`);
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
    .from(users)
    .leftJoin(
      notificationPreferences,
      eq(users.id, notificationPreferences.userId)
    )
    .leftJoin(teamMembers, eq(teamMembers.userId, users.id))
    .leftJoin(teams, eq(teams.id, teamMembers.teamId))
    .where(isNull(users.deletedAt));

  console.log(
    `[notifier] Found ${recipients.length} total recipients (users) from database`
  );
  console.log(
    `[notifier] Raw recipient data:`,
    recipients.map((r) => ({
      userId: r.userId,
      email: r.email,
      emailEnabled: r.emailEnabled,
      hasPreference: r.emailEnabled !== null,
    }))
  );

  // Filter recipients: include users with either email OR SMS enabled
  // Note: emailEnabled defaults to true in schema, so null means enabled by default
  console.log(`[notifier] Filtering recipients for email or SMS enabled...`);
  const activeRecipients = recipients.filter((r) => {
    // Include recipients with either email or SMS enabled
    // emailEnabled is null when user has no preferences, which means enabled by default (schema default is true)
    const emailEnabled = r.emailEnabled !== false; // true or null means enabled
    const smsEnabled = r.smsEnabled === true;
    const hasPhoneNumber = Boolean(r.phoneNumber);
    const canSendSms = true;
    // smsEnabled &&
    // hasPhoneNumber &&
    // canUseSMS({
    //   subscriptionStatus: r.teamSubscriptionStatus ?? null,
    //   planName: r.teamPlanName ?? null,
    // });
    const isActive = emailEnabled || canSendSms;
    console.log(
      `[notifier]   Checking ${r.email}: emailEnabled=${r.emailEnabled} (treated as ${emailEnabled}), smsEnabled=${r.smsEnabled}, hasPhoneNumber=${hasPhoneNumber}, canSendSms=${canSendSms}, isActive=${isActive}`
    );
    return isActive;
  });

  console.log(
    `[notifier] ${activeRecipients.length} active recipients (email or SMS enabled) out of ${recipients.length} total`
  );
  if (activeRecipients.length === 0) {
    console.log(`[notifier] ⚠️  WARNING: No active recipients found!`);
    console.log(`[notifier] All recipients:`, recipients);
  }
  activeRecipients.forEach((r) => {
    const emailEnabled = r.emailEnabled === true;
    const smsEnabled = r.smsEnabled === true;
    const canSendSms = true;
    // smsEnabled && Boolean(r.phoneNumber);
    // && canUseSMS({
    //   subscriptionStatus: r.teamSubscriptionStatus ?? null,
    //   planName: r.teamPlanName ?? null,
    // });
    console.log(
      `[notifier]   ✅ Active: ${r.email} (emailEnabled: ${emailEnabled}, smsEnabled: ${smsEnabled}, canSendSms: ${canSendSms})`
    );
  });

  if (activeRecipients.length === 0) {
    console.log(
      "[notifier] No active recipients found - skipping notifications"
    );
    return { notifiedProductIds: [] as number[] };
  }

  const smsProvider = createSmsProviderFromEnv();

  const totalNotifications = activeRecipients.length;
  console.log(
    `[notifier] Preparing to send notifications to ${totalNotifications} recipients (email and/or SMS with ${pendingArrivals.length} products)...`
  );
  console.log(
    `[notifier] Breakdown: ${activeRecipients.length} recipients, ${pendingArrivals.length} products per notification`
  );

  /**
   * Send one email and/or SMS per recipient with all new arrivals.
   * Everyone gets alerted with all products in a single notification.
   * Use allSettled so individual failures don't stop the whole process.
   */
  console.log(`[notifier] Starting to send notifications...`);
  console.log(`[notifier] Total recipients to process: ${activeRecipients.length}`);
  console.log(`[notifier] Recipients:`, activeRecipients.map(r => ({
    email: r.email,
    emailEnabled: r.emailEnabled,
    smsEnabled: r.smsEnabled,
    hasPhoneNumber: !!r.phoneNumber,
  })));

  const notificationPromises = activeRecipients
    .map((recipient) => {
      // Only send when explicitly enabled (true), not when null or false
      const emailEnabled = recipient.emailEnabled === true;
      const smsEnabled = recipient.smsEnabled === true;

      const canSendSms = true;
      // smsEnabled &&
      // Boolean(recipient.phoneNumber) &&
      // canUseSMS({
      //   subscriptionStatus: recipient.teamSubscriptionStatus ?? null,
      //   planName: recipient.teamPlanName ?? null,
      // });
      console.log(
        `[notifier] Processing recipient ${recipient.email}: emailEnabled=${emailEnabled}, smsEnabled=${smsEnabled}, canSendSms=${canSendSms}, products=${pendingArrivals.length}`
      );

      const emailPromise = emailEnabled
        ? (async () => {
            console.log(`[notifier] Attempting to send email to ${recipient.email}...`);
            try {
              await sendNewArrivalEmail({
                to: recipient.email,
                products: pendingArrivals.map((arrival) => ({
                  name: formatProductName(arrival.name),
                  url: arrival.url,
                  imageUrl: arrival.imageUrl,
                })),
              });
              console.log(
                `[notifier] ✅ Email sent successfully to ${recipient.email} with ${pendingArrivals.length} products`
              );
            } catch (error) {
              console.error(
                `[notifier] ❌ Failed to send email to ${recipient.email}:`,
                error
              );
              console.error(
                `[notifier] Error type:`,
                error instanceof Error ? error.constructor.name : typeof error
              );
              console.error(
                `[notifier] Error message:`,
                error instanceof Error ? error.message : String(error)
              );
              console.error(
                `[notifier] Error stack:`,
                error instanceof Error ? error.stack : "No stack trace"
              );
              throw error;
            }
          })()
        : (() => {
            console.log(`[notifier] Skipping email for ${recipient.email} (emailEnabled=false)`);
            return Promise.resolve();
          })();

      const smsBody =
        pendingArrivals.length === 1
          ? `🎉 New Jellycat: ${formatProductName(pendingArrivals[0].name)} - ${pendingArrivals[0].url}`
          : `🎉 ${pendingArrivals.length} New Jellycats:\n${pendingArrivals
              .map((a, i) => `${i + 1}. ${formatProductName(a.name)} `)
              .join("\n")}`;
      // - ${a.url}
      const smsPromise = canSendSms
        ? smsProvider
            .send({
              to: recipient.phoneNumber as string,
              body: smsBody,
            })
            .then(() => {
              console.log(
                `[notifier] ✅ SMS sent successfully to ${recipient.phoneNumber} with ${pendingArrivals.length} products`
              );
            })
            .catch((error) => {
              console.error(
                `[notifier] ❌ Failed to send SMS to ${recipient.phoneNumber}:`,
                error
              );
              console.error(
                `[notifier] Error details:`,
                error instanceof Error ? error.message : String(error)
              );
              throw error;
            })
        : Promise.resolve();

      return [emailPromise, smsPromise];
    })
    .flat();

  console.log(
    `[notifier] Created ${notificationPromises.length} notification promises, awaiting all...`
  );
  console.log(`[notifier] Starting Promise.allSettled...`);
  const startTime = Date.now();
  const results = await Promise.allSettled(notificationPromises);
  const duration = Date.now() - startTime;
  console.log(`[notifier] Promise.allSettled completed in ${duration}ms`);

  const successful = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;
  console.log(
    `[notifier] Notification results: ${successful} succeeded, ${failed} failed out of ${results.length} total`
  );

  if (failed > 0) {
    console.error(`[notifier] ⚠️ ${failed} notification(s) failed:`);
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(`[notifier]   Failed promise ${index}:`, {
          reason: result.reason,
          message: result.reason instanceof Error ? result.reason.message : String(result.reason),
          stack: result.reason instanceof Error ? result.reason.stack : undefined,
        });
      }
    });
  } else {
    console.log(`[notifier] ✅ All notifications completed successfully`);
  }

  // Mark products as notified even if some emails failed (we don't want to retry forever)
  const notifiedAt = new Date();
  const notifiedIds = pendingArrivals.map((r) => r.productId);

  console.log(
    `[notifier] Marking ${
      notifiedIds.length
    } products as notified with timestamp: ${notifiedAt.toISOString()}`
  );
  console.log(`[notifier] Product IDs to mark:`, notifiedIds);

  await db
    .update(products)
    .set({ notifiedAt })
    .where(inArray(products.id, notifiedIds));

  console.log(
    `[notifier] ✅ Database update completed. Marked ${notifiedIds.length} products as notified`
  );
  console.log(`[notifier] Returning notifiedProductIds:`, notifiedIds);
  console.log(`[notifier] ========================================`);
  console.log(`[notifier] ✅ Notification process completed successfully`);
  console.log(`[notifier] Summary: ${notifiedIds.length} products notified to ${activeRecipients.length} recipients`);

  return { notifiedProductIds: notifiedIds };
}
