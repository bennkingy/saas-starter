'use client';

import { useActionState, Suspense } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import type { NotificationPreferences, TeamDataWithMembers, User } from '@/lib/db/schema';
import { JELLYCAT_NEW_URL } from '@/lib/config/products';
import { updateNotificationPreferencesAction } from './actions';

type ActionState = {
  error?: string;
  success?: string;
  smsEnabled?: boolean;
  phoneNumber?: string;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function isActiveSubscription(status: string | null | undefined) {
  return status === 'active' || status === 'trialing';
}

function isProPlan(planName: string | null | undefined) {
  return (planName ?? '').toLowerCase() === 'pro';
}

function PreferencesFormSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification preferences</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 animate-pulse">
          <div className="h-4 w-48 bg-gray-200 rounded" />
          <div className="h-10 w-full bg-gray-200 rounded" />
          <div className="h-4 w-32 bg-gray-200 rounded" />
          <div className="h-10 w-full bg-gray-200 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

function PreferencesForm({ state }: { state: ActionState }) {
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const { data: team } = useSWR<TeamDataWithMembers>('/api/team', fetcher);
  const { data: prefs } = useSWR<NotificationPreferences>(
    '/api/notification-preferences',
    fetcher
  );

  const subscriptionActive = isActiveSubscription(team?.subscriptionStatus);
  const proPlan = isProPlan(team?.planName);
  const smsAvailable = subscriptionActive && proPlan;

  const smsUnavailableReason = !subscriptionActive
    ? 'Active subscription required.'
    : !proPlan
      ? 'Pro plan only.'
      : null;

  const smsEnabledValue = prefs?.smsEnabled ?? false;
  const phoneNumberValue = prefs?.phoneNumber ?? '';

  return (
    <>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-gray-900">
                Status:{' '}
                <span className="capitalize">
                  {team?.subscriptionStatus || 'free plan'}
                </span>
              </p>
              <p className="text-sm text-gray-600">Email alerts: Enabled</p>
              <p className="text-sm text-gray-600">
                SMS alerts: {smsAvailable ? 'available' : 'Pro plan only'}
              </p>
            </div>
            <Button asChild>
              <a href="/pricing">Manage plan</a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Delivery</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="mb-2">Email (required)</Label>
            <Input value={user?.email ?? ''} readOnly />
            <p className="text-xs text-gray-600 mt-2">
              Email alerts are free and always enabled for new arrival notifications.
            </p>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <Label className="mb-1">SMS alerts</Label>
                <p className="text-xs text-gray-600">
                  Optional. Requires an active Pro plan (£3/month).
                </p>
              </div>
              {smsUnavailableReason ? (
                <Button asChild className="shrink-0">
                  <a href="/pricing">Upgrade</a>
                </Button>
              ) : (
                <label className="inline-flex items-center gap-2">
                  <input
                    name="smsEnabled"
                    type="checkbox"
                    defaultChecked={smsEnabledValue}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="text-sm text-gray-900">Enabled</span>
                </label>
              )}
            </div>

            <div className="mt-4">
              <Label htmlFor="phoneNumber" className="mb-2">
                Phone number (E.164)
              </Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                placeholder="+15551234567"
                defaultValue={phoneNumberValue}
                disabled={Boolean(smsUnavailableReason) || !smsEnabledValue}
              />
              {smsUnavailableReason ? (
                <p className="text-xs text-gray-600 mt-2">
                  {smsUnavailableReason}{' '}
                  <a
                    href="/pricing"
                    className="text-primary underline underline-offset-4 hover:text-primary/90"
                  >
                    Upgrade
                  </a>
                </p>
              ) : null}
              <p className="text-xs text-gray-600 mt-2">
                TODO: SMS provider integration (Twilio) is scaffolded and must be
                configured before sending.
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-2">
          {state.error ? <p className="text-red-500 text-sm">{state.error}</p> : null}
          {state.success ? (
            <p className="text-green-600 text-sm">{state.success}</p>
          ) : null}
        </CardFooter>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>How It Works</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <p className="flex items-start gap-2">
              <span className="text-primary font-medium">1.</span>
              We monitor the{' '}
              <a
                href={JELLYCAT_NEW_URL}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:text-primary/80 underline underline-offset-4"
              >
                Jellycat New page
              </a>{' '}
              for new product drops.
            </p>
            <p className="flex items-start gap-2">
              <span className="text-primary font-medium">2.</span>
              When brand new Jellycats appear, we instantly alert all subscribers.
            </p>
            <p className="flex items-start gap-2">
              <span className="text-primary font-medium">3.</span>
              No need to pick specific items—you'll hear about every new release!
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export default function PreferencesPage() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updateNotificationPreferencesAction,
    {}
  );

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">
        Notification preferences
      </h1>

      <form action={formAction}>
        <Suspense fallback={<PreferencesFormSkeleton />}>
          <PreferencesForm state={state} />
        </Suspense>

        <Button
          type="submit"
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save preferences'
          )}
        </Button>
      </form>
    </section>
  );
}

