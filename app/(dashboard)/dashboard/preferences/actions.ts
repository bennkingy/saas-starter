'use server';

import { z } from 'zod';
import { validatedActionWithUser } from '@/lib/auth/middleware';
import { getTeamForUser, updateNotificationPreferencesForUser } from '@/lib/db/queries';
import { canReceiveNotifications, canUseSMS } from '@/lib/subscriptions/guards';

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[1-9]\d{7,14}$/, 'Enter a valid phone number (E.164 format).');

const updatePreferencesSchema = z.object({
  smsEnabled: z.preprocess((value) => value === 'on', z.boolean()),
  phoneNumber: z.string().optional(),
});

export const updateNotificationPreferencesAction = validatedActionWithUser(
  updatePreferencesSchema,
  async (data) => {
    const team = await getTeamForUser();
    if (!team) {
      return { error: 'Team not found.' };
    }

    const wantsSms = data.smsEnabled;
    const smsAllowed = canUseSMS({
      subscriptionStatus: team.subscriptionStatus ?? null,
      planName: team.planName ?? null,
    });

    if (wantsSms && !smsAllowed) {
      return { error: 'SMS alerts require the Pro plan.' };
    }

    const phoneNumberTrimmed = (data.phoneNumber ?? '').trim();
    const phoneNumber = wantsSms ? phoneSchema.safeParse(phoneNumberTrimmed) : null;

    if (wantsSms && phoneNumber && !phoneNumber.success) {
      return {
        error: phoneNumber.error.errors[0]?.message ?? 'Invalid phone number.',
        smsEnabled: wantsSms,
        phoneNumber: phoneNumberTrimmed,
      };
    }

    await updateNotificationPreferencesForUser({
      smsEnabled: wantsSms,
      phoneNumber: wantsSms ? phoneNumberTrimmed : null,
    });

    return {
      success: 'Notification preferences updated.',
      smsEnabled: wantsSms,
      phoneNumber: wantsSms ? phoneNumberTrimmed : '',
    };
  }
);

