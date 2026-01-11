import { checkoutAction } from '@/lib/payments/actions';
import { Check } from 'lucide-react';
import { getStripePrices, getStripeProducts } from '@/lib/payments/stripe';
import { SubmitButton } from './submit-button';
import Link from 'next/link';
import { getRecentNewArrivals, getUser } from '@/lib/db/queries';

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

// Prices are fresh for one hour max
export const revalidate = 3600;

export default async function PricingPage() {
  const user = await getUser();
  const recentArrivals = await getRecentNewArrivals(4);
  const [prices, products] = await Promise.all([
    getStripePrices(),
    getStripeProducts(),
  ]);

  const proPlan = products.find((product) => product.name === 'Pro');

  const proPrice = prices.find((price) => price.productId === proPlan?.id);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
        <div className="pt-6 rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-2xl font-medium text-gray-900 mb-2">Free</h2>
          <p className="text-sm text-gray-600 mb-4">Email alerts are free — just create an account.</p>
          <p className="text-4xl font-medium text-gray-900 mb-6">Free</p>
          <ul className="space-y-4 mb-8">
            {[
              'Email alerts (free)',
              'Instant new arrival notifications',
              'See latest products and recent arrivals in your dashboard',
            ].map((feature) => (
              <li key={feature} className="flex items-start">
                <Check className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">{feature}</span>
              </li>
            ))}
          </ul>
          {user ? (
            <Link href="/dashboard/preferences" className="inline-flex w-full">
              <SubmitButton />
            </Link>
          ) : (
            <Link href="/sign-up" className="inline-flex w-full">
              <SubmitButton />
            </Link>
          )}
        </div>

        <PricingCard
          name={proPlan?.name || 'Pro'}
          price={proPrice?.unitAmount ?? 300}
          currency={(proPrice?.currency ?? 'gbp').toLowerCase()}
          interval={proPrice?.interval || 'month'}
          trialDays={7}
          features={[
            'Everything in Free, plus:',
            'SMS alerts (optional)',
            'SMS delivery preferences',
          ]}
          priceId={proPrice?.id}
          isConfigured={Boolean(proPlan?.id && proPrice?.id)}
        />
      </div>

      <section className="mt-14 border-t border-gray-200 pt-12">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Latest alerts</h2>
            <p className="mt-1 text-sm text-gray-600">The most recent products we detected.</p>
          </div>
          <Link href="/dashboard/alerts" className="text-sm text-gray-700 underline">
            View all alerts
          </Link>
        </div>

        {recentArrivals.length > 0 ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
          <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-700">
            No alerts yet — once the first scan runs, you’ll see the latest 4 here.
          </div>
        )}
      </section>
    </main>
  );
}

function PricingCard({
  name,
  price,
  currency,
  interval,
  trialDays,
  features,
  priceId,
  isConfigured,
}: {
  name: string;
  price: number;
  currency: string;
  interval: string;
  trialDays: number;
  features: string[];
  priceId?: string;
  isConfigured: boolean;
}) {
  const formattedPrice =
    price === 0
      ? 'Free'
      : currency === 'gbp'
        ? `£${price / 100}`
        : `${price / 100} ${currency.toUpperCase()}`;

  return (
    <div className="pt-6 rounded-2xl border border-gray-200 bg-white p-6">
      <h2 className="text-2xl font-medium text-gray-900 mb-2">{name}</h2>
      <p className="text-sm text-gray-600 mb-4">
        with {trialDays} day free trial
      </p>
      <p className="text-4xl font-medium text-gray-900 mb-6">
        {formattedPrice}{' '}
        <span className="text-xl font-normal text-gray-600">
          / {interval}
        </span>
      </p>
      <ul className="space-y-4 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <Check className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>
      {isConfigured ? (
        <form action={checkoutAction}>
          <input type="hidden" name="priceId" value={priceId} />
          <SubmitButton />
        </form>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Pro plan is not configured in Stripe yet.
        </div>
      )}
    </div>
  );
}
