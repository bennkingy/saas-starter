import 'server-only';

import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import {
  notificationPreferences,
  stockEvents,
  teamMembers,
  teams,
  users,
} from '@/lib/db/schema';
import type { NewArrivalDetected } from '@/lib/stock/differ';
import { sendNewArrivalEmail } from '@/lib/notifications/email';
import { createSmsProviderFromEnv } from '@/lib/notifications/sms';
import { canReceiveNotifications, canUseSMS } from '@/lib/subscriptions/guards';

type NotifyArgs = {
  newArrivals: NewArrivalDetected[];
};

async function ensurePreferencesExistForUsers(userIds: number[]) {
  if (userIds.length === 0) return;

  await db
    .insert(notificationPreferences)
    .values(
      userIds.map((userId) => ({
        userId,
      }))
    )
    .onConflictDoNothing();
}

export async function notifySubscribersOfNewArrivals({ newArrivals }: NotifyArgs) {
  if (newArrivals.length === 0) return { notifiedEventIds: [] as number[] };

  const eventIds = newArrivals.map((r) => r.stockEventId);

  /**
   * Idempotency: only notify events that haven't been marked notified yet.
   * We mark `notifiedAt` only after all notifications succeed.
   */
  const pendingEvents = await db
    .select({ id: stockEvents.id })
    .from(stockEvents)
    .where(and(inArray(stockEvents.id, eventIds), eq(stockEvents.notifiedAt, null)));

  const pendingEventIdSet = new Set(pendingEvents.map((e) => e.id));
  const pendingArrivals = newArrivals.filter((r) => pendingEventIdSet.has(r.stockEventId));

  if (pendingArrivals.length === 0) {
    return { notifiedEventIds: [] as number[] };
  }

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
    .innerJoin(teamMembers, eq(teamMembers.userId, users.id))
    .innerJoin(teams, eq(teams.id, teamMembers.teamId))
    .leftJoin(notificationPreferences, eq(notificationPreferences.userId, users.id));

  const activeRecipients = recipients.filter((r) =>
    canReceiveNotifications({ subscriptionStatus: r.teamSubscriptionStatus ?? null })
  );

  const activeRecipientIds = activeRecipients.map((r) => r.userId);
  await ensurePreferencesExistForUsers(activeRecipientIds);

  const smsProvider = createSmsProviderFromEnv();

  /**
   * Send notifications to ALL active subscribers for each new arrival.
   * Everyone gets alerted - no per-user product selection needed.
   */
  await Promise.all(
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
          : Promise.resolve();

        const canSendSms =
          smsEnabled &&
          Boolean(recipient.phoneNumber) &&
          canUseSMS({
            subscriptionStatus: recipient.teamSubscriptionStatus ?? null,
            planName: recipient.teamPlanName ?? null,
          });

        const smsPromise = canSendSms
          ? smsProvider.send({
              to: recipient.phoneNumber as string,
              body: `🎉 New Jellycat: ${arrival.name} - ${arrival.url}`,
            })
          : Promise.resolve();

        return [emailPromise, smsPromise];
      })
    )
  );

  const notifiedAt = new Date();
  const notifiedIds = pendingArrivals.map((r) => r.stockEventId);

  await db
    .update(stockEvents)
    .set({ notifiedAt })
    .where(inArray(stockEvents.id, notifiedIds));

  return { notifiedEventIds: notifiedIds };
}
