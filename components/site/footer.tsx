"use client";

import Link from "next/link";
import { Suspense } from "react";
import useSWR from "swr";
import { SiteLogo } from "./site-logo";
import { User, TeamDataWithMembers } from "@/lib/db/schema";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function isActiveSubscription(status: string | null | undefined) {
  return status === "active" || status === "trialing";
}

function isProPlan(planName: string | null | undefined) {
  return (planName ?? "").toLowerCase() === "plus";
}

function hasActiveProSubscription(
  team: TeamDataWithMembers | null | undefined
) {
  if (!team) return false;
  return (
    isActiveSubscription(team.subscriptionStatus) && isProPlan(team.planName)
  );
}

function FooterNav() {
  const { data: user } = useSWR<User>("/api/user", fetcher);
  const { data: team } = useSWR<TeamDataWithMembers>("/api/team", fetcher);

  if (!user) {
    return (
      <>
        <Link
          href="/"
          className="font-medium text-slate-900/80 hover:text-slate-900"
        >
          Home
        </Link>
        <Link
          href="/pricing"
          className="font-medium text-slate-900/80 hover:text-slate-900"
        >
          Pricing
        </Link>
        <Link
          href="/sign-in"
          className="font-medium text-slate-900/80 hover:text-slate-900"
        >
          Sign in
        </Link>
      </>
    );
  }

  const hasProSubscription = hasActiveProSubscription(team);

  return (
    <>
      <Link
        href="/dashboard/alerts"
        className="font-medium text-slate-900/80 hover:text-slate-900"
      >
        Alerts
      </Link>
      <Link
        href="/dashboard/preferences"
        className="font-medium text-slate-900/80 hover:text-slate-900"
      >
        Notifications
      </Link>
      {!hasProSubscription && (
        <Link
          href="/pricing"
          className="font-medium text-slate-900/80 hover:text-slate-900"
        >
          Upgrade
        </Link>
      )}
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-slate-900/10 bg-[#34cde5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div>
            <SiteLogo variant="footer" />
            <div className="mt-1 text-sm font-medium text-slate-900/80">
              Friendly alerts for new arrivals and restocks.
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            <Suspense fallback={<div className="h-5" />}>
              <FooterNav />
            </Suspense>
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-slate-900/10 pt-6 text-xs font-medium text-slate-900/70 md:flex-row md:items-center md:justify-between">
          <div>
            © {new Date().getFullYear()} Jelly Drop. All rights reserved.
          </div>
          <div className="max-w-2xl text-slate-900/70">
            "Jellycat" is a trademark of its respective owner. This site is not
            affiliated with Jellycat.
          </div>
        </div>
      </div>
    </footer>
  );
}
