import Link from 'next/link';
import { BellRing, Cat } from 'lucide-react';

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-slate-900/10 bg-[#34cde5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-base font-bold text-slate-900">
              <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900/10 ring-1 ring-slate-900/10">
                <Cat className="h-5 w-5 text-slate-900" />
                <span className="absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-white text-[#34cde5]">
                  <BellRing className="h-2.5 w-2.5" />
                </span>
              </span>
              <span>Jellycat Alerts</span>
            </div>
            <div className="mt-1 text-sm font-medium text-slate-900/80">
              Friendly alerts for new arrivals and restocks.
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            <Link href="/" className="font-medium text-slate-900/80 hover:text-slate-900">
              Home
            </Link>
            <Link href="/pricing" className="font-medium text-slate-900/80 hover:text-slate-900">
              Pricing
            </Link>
            <Link href="/dashboard" className="font-medium text-slate-900/80 hover:text-slate-900">
              Dashboard
            </Link>
            <Link href="/sign-in" className="font-medium text-slate-900/80 hover:text-slate-900">
              Sign in
            </Link>
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-slate-900/10 pt-6 text-xs font-medium text-slate-900/70 md:flex-row md:items-center md:justify-between">
          <div>© {new Date().getFullYear()} Jellycat Alerts. All rights reserved.</div>
          <div className="max-w-2xl text-slate-900/70">
            “Jellycat” is a trademark of its respective owner. This site is not affiliated
            with Jellycat.
          </div>
        </div>
      </div>
    </footer>
  );
}

