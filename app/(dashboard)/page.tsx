import { Button } from '@/components/ui/button';
import { ArrowRight, Bell, Search, Sparkles } from 'lucide-react';
import { getRecentNewArrivals } from '@/lib/db/queries';
import { JELLYCAT_NEW_URL } from '@/lib/config/products';
import { HeroParallaxImage } from './_components/hero-parallax-image';

function formatRelativeTime(date: Date) {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export default async function HomePage() {
  const recentArrivals = await getRecentNewArrivals(4);

  const howItWorksSteps = [
    {
      step: 1,
      title: 'We monitor the Jellycat New page',
      description: (
        <>
          We watch the{' '}
          <a
            href={JELLYCAT_NEW_URL}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-gray-900 underline decoration-gray-300 underline-offset-4 hover:decoration-gray-500"
          >
            Jellycat New page
          </a>{' '}
          for new product drops.
        </>
      ),
      Icon: Search,
    },
    {
      step: 2,
      title: 'We alert you instantly',
      description: 'When brand new Jellycats appear, we instantly alert all subscribers.',
      Icon: Bell,
    },
    {
      step: 3,
      title: 'No item picking required',
      description: 'No need to pick specific items — you’ll hear about every new release.',
      Icon: Sparkles,
    },
  ] as const;

  return (
    <main>
      <section className="relative py-20 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-32 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-primary/10 blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="max-w-2xl text-center lg:text-left">
              <h1 className="text-4xl font-bold text-gray-900 tracking-tight sm:text-5xl md:text-6xl">
                Never miss a
                <span className="block text-primary">Jellycat drop</span>
              </h1>
              <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-xl lg:text-lg xl:text-xl">
                Friendly, fast alerts for new arrivals (and the restocks everyone
                is refreshing for). Get an email the moment something you want
                shows up. SMS is optional on the Plus plan.
              </p>
              <div className="mt-8 flex flex-col items-center gap-3 lg:items-start">
                <a href="/pricing">
                  <Button size="lg" className="text-lg rounded-full">
                    Get new arrival alerts
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </a>
                <a href="/dashboard" className="text-sm text-gray-600 underline">
                  Already subscribed? Go to dashboard
                </a>
              </div>
            </div>

            <HeroParallaxImage
              src="https://static.independent.co.uk/2025/09/23/0/43/jellycat-hero.png"
              alt="Jellycat plush toys"
            />
          </div>
        </div>
      </section>

      <section className="relative py-16 w-full border-t border-gray-100 bg-gradient-to-b from-white to-gray-50 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-44 -right-40 h-[26rem] w-[26rem] rounded-full bg-primary/10 blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-primary" />
              How it works
            </div>
            <h2 className="mt-4 text-3xl font-bold text-gray-900 sm:text-4xl">
              From drop to inbox in minutes
            </h2>
            <p className="mt-3 text-base text-gray-600">
              Simple setup. Automatic monitoring. Fast alerts when new Jellycats appear.
            </p>
          </div>

          <div className="relative mt-10 grid gap-6 md:grid-cols-3">
            <div className="pointer-events-none absolute left-1/2 top-7 hidden h-px w-[70%] -translate-x-1/2 border-t border-dashed border-gray-200 md:block" />

            {howItWorksSteps.map((step) => (
              <div
                key={step.step}
                className="group relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-primary/10 blur-2xl transition-opacity group-hover:opacity-80" />

                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                      <step.Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                      {step.step}
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <h3 className="text-base font-semibold text-gray-900">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-16 bg-white w-full border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Latest alerts</h2>
              <p className="mt-2 text-base text-gray-600">
                The most recent Jellycats we detected on the New page.
              </p>
            </div>
            <a href="/dashboard/alerts" className="text-sm text-gray-700 underline">
              View all alerts
            </a>
          </div>

          {recentArrivals.length > 0 ? (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {recentArrivals.map((arrival) => (
                <a
                  key={arrival.id}
                  href={arrival.productUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative isolate overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 before:absolute before:inset-0 before:z-0 before:origin-bottom before:scale-y-0 before:bg-primary before:transition-transform before:duration-300 before:content-[''] group-hover:before:scale-y-100"
                >
                  <div className="relative z-10 aspect-square w-full overflow-hidden rounded-xl bg-gray-50">
                    {arrival.productImageUrl ? (
                      <img
                        src={arrival.productImageUrl}
                        alt={arrival.productName}
                        className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="h-full w-full bg-gray-100" />
                    )}
                  </div>
                  <div className="relative z-10 mt-3">
                    <p className="font-medium text-gray-900 line-clamp-2">
                      {arrival.productName}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Detected {formatRelativeTime(arrival.detectedAt)}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="mt-10 rounded-2xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-700">
              No alerts yet — once the first scan runs, you’ll see the latest 4 here.
            </div>
          )}
        </div>
      </section>


      <section className="py-16 bg-gray-50 hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                Ready for alerts?
              </h2>
              <p className="mt-3 max-w-3xl text-lg text-gray-500">
                Pick a plan, then manage your notification preferences in the
                dashboard.
              </p>
            </div>
            <div className="mt-8 lg:mt-0 flex justify-center lg:justify-end">
              <a href="/pricing">
                <Button size="lg" variant="outline" className="text-lg rounded-full">
                  View pricing
                  <ArrowRight className="ml-3 h-6 w-6" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
