import 'server-only';

import type { Team } from '@/lib/db/schema';

const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing'] as const;

export function isSubscriptionActive(team: Pick<Team, 'subscriptionStatus'>) {
  const status = team.subscriptionStatus;
  if (!status) return false;
  return ACTIVE_SUBSCRIPTION_STATUSES.some((s) => s === status);
}

export function canReceiveNotifications(team: Pick<Team, 'subscriptionStatus'>) {
  // Email alerts are free: if a team exists, notifications are allowed.
  // Subscription is only required for SMS.
  return true;
}

export function canUseSMS(team: Pick<Team, 'subscriptionStatus' | 'planName'>) {
  if (!isSubscriptionActive(team)) return false;
  return (team.planName ?? '').toLowerCase() === 'plus';
}

