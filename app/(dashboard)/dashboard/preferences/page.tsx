"use client";

import { useActionState, Suspense, useState, useEffect } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import type {
  NotificationPreferences,
  TeamDataWithMembers,
  User,
} from "@/lib/db/schema";
import { JELLYCAT_NEW_URL } from "@/lib/config/products";
import { updateNotificationPreferencesAction } from "./actions";

type ActionState = {
  error?: string;
  success?: string;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  phoneNumber?: string;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function isActiveSubscription(status: string | null | undefined) {
  return status === "active" || status === "trialing";
}

function isProPlan(planName: string | null | undefined) {
  return (planName ?? "").toLowerCase() === "plus";
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
  const { data: user } = useSWR<User>("/api/user", fetcher);
  const { data: team } = useSWR<TeamDataWithMembers>("/api/team", fetcher);
  const { data: prefs } = useSWR<NotificationPreferences>(
    "/api/notification-preferences",
    fetcher
  );

  const subscriptionActive = isActiveSubscription(team?.subscriptionStatus);
  const proPlan = isProPlan(team?.planName);
  const smsAvailable = subscriptionActive && proPlan;

  const emailEnabledValue = state.emailEnabled ?? prefs?.emailEnabled ?? false;
  const smsEnabledValue = state.smsEnabled ?? prefs?.smsEnabled ?? false;
  const phoneNumberValue = state.phoneNumber ?? prefs?.phoneNumber ?? "";

  const [emailEnabled, setEmailEnabled] = useState(emailEnabledValue);
  const [smsEnabled, setSmsEnabled] = useState(smsEnabledValue);

  useEffect(() => {
    setEmailEnabled(emailEnabledValue);
  }, [emailEnabledValue]);

  useEffect(() => {
    setSmsEnabled(smsEnabledValue);
  }, [smsEnabledValue]);

  return (
    <>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-gray-900">
                <span className="capitalize mb-3">
                  {team?.subscriptionStatus || "free plan"}
                </span>
              </p>
            </div>
            <Button asChild>
              <a href="/pricing">Manage plan</a>
            </Button>
          </div>

          <div className="border-t border-gray-200 pt-6 space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    name="emailEnabled"
                    type="checkbox"
                    checked={emailEnabled}
                    onChange={(e) => setEmailEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div
                    className={`w-11 h-6 rounded-full relative after:content-[''] after:absolute after:top-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${
                      emailEnabled
                        ? "bg-primary after:right-[2px]"
                        : "bg-gray-200 after:left-[2px]"
                    }`}
                  ></div>
                </label>
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    Email alerts
                  </span>
                  <p className="text-xs text-gray-600">
                    Email alerts are free always.
                  </p>
                </div>
              </div>
              {emailEnabled && (
                <div className="ml-14">
                  <Label htmlFor="email" className="mb-2">
                    Email
                  </Label>
                  <Input
                    id="email"
                    value={user?.email ?? ""}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <label
                      className={`relative inline-flex items-center ${
                        smsAvailable ? "cursor-pointer" : "cursor-not-allowed"
                      }`}
                    >
                      <input
                        name="smsEnabled"
                        type="checkbox"
                        checked={smsAvailable && smsEnabled}
                        disabled={!smsAvailable}
                        onChange={(e) =>
                          smsAvailable && setSmsEnabled(e.target.checked)
                        }
                        className="sr-only peer"
                      />
                      <div
                        className={`w-11 h-6 rounded-full relative after:content-[''] after:absolute after:top-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${
                          smsAvailable && smsEnabled
                            ? "bg-primary after:right-[2px]"
                            : "bg-gray-200 after:left-[2px]"
                        } ${!smsAvailable ? "opacity-50" : ""}`}
                      ></div>
                    </label>
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        SMS alerts
                      </span>
                      <p className="text-xs text-gray-600">
                        Requires an active Plus plan (£3/month).
                      </p>
                    </div>
                  </div>
                </div>
                {!smsAvailable && (
                  <Button asChild className="shrink-0">
                    <a href="/pricing">Upgrade</a>
                  </Button>
                )}
              </div>
              {smsEnabled && smsAvailable && (
                <div className="ml-14">
                  <Label htmlFor="phoneNumber" className="mb-2">
                    Phone number (E.164)
                  </Label>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    placeholder="+15551234567"
                    defaultValue={phoneNumberValue}
                  />
                  <p className="text-xs text-gray-600 mt-2">
                    Enter your phone number in E.164 format (e.g.,
                    +15551234567). You'll receive SMS alerts when new Jellycats
                    are detected.
                  </p>
                </div>
              )}
              {!smsAvailable && (
                <div className="ml-14">
                  <p className="text-xs text-gray-600">
                    Active subscription required.{" "}
                    <a
                      href="/pricing"
                      className="text-primary underline underline-offset-4 hover:text-primary/90"
                    >
                      Upgrade
                    </a>
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-2">
          {state.error ? (
            <p className="text-red-500 text-sm">{state.error}</p>
          ) : null}
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
              We monitor the{" "}
              <a
                href={JELLYCAT_NEW_URL}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:text-primary/80 underline underline-offset-4"
              >
                Jellycat New page
              </a>{" "}
              for new product drops.
            </p>
            <p className="flex items-start gap-2">
              <span className="text-primary font-medium">2.</span>
              When brand new Jellycats appear, we instantly alert all
              subscribers.
            </p>
            <p className="flex items-start gap-2">
              <span className="text-primary font-medium">3.</span>
              No need to pick specific items—you'll hear about every new
              release!
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
            "Save preferences"
          )}
        </Button>
      </form>
    </section>
  );
}
