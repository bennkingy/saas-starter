import { checkoutAction } from "@/lib/payments/actions";
import { Check } from "lucide-react";
import { getStripePrices, getStripeProducts } from "@/lib/payments/stripe";
import { SubmitButton } from "./submit-button";
import Link from "next/link";
import { getRecentNewArrivals, getUser } from "@/lib/db/queries";
import { LatestAlerts } from "@/components/site/latest-alerts";

// Prices are fresh for one hour max
export const revalidate = 3600;

export default async function PricingPage() {
  const user = await getUser();
  const recentArrivals = await getRecentNewArrivals(4);
  const [prices, products] = await Promise.all([
    getStripePrices(),
    getStripeProducts(),
  ]);

  const proPlan = products.find((product) => product.name === "Pro");

  const proPrice = prices.find((price) => price.productId === proPlan?.id);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-3xl mx-auto mb-12 text-center">
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight sm:text-5xl">
          Choose your plan
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Get instant alerts for new Jellycat arrivals. Start free, upgrade
          anytime.
        </p>
      </div>
      <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
        <div className="pt-6 rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-2xl font-medium text-gray-900 mb-2">Basic</h2>
          <p className="text-sm text-gray-600 mb-4">
            Email alerts are free — just create an account.
          </p>
          <p className="text-4xl font-medium text-gray-900 mb-6">Free</p>
          <ul className="space-y-4 mb-8">
            {[
              "Email alerts",
              "Instant new arrival notifications",
              "See all latest alerts in your dashboard",
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
          name={proPlan?.name || "Pro"}
          price={proPrice?.unitAmount ?? 300}
          currency={(proPrice?.currency ?? "gbp").toLowerCase()}
          interval={proPrice?.interval || "month"}
          trialDays={7}
          features={["Everything in free, plus:", "SMS alerts"]}
          priceId={proPrice?.id}
          isConfigured={Boolean(proPlan?.id && proPrice?.id)}
        />
      </div>

      <LatestAlerts
        recentArrivals={recentArrivals}
        variant="compact"
        title="Latest alerts"
        description="The most recent products we detected."
      />
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
      ? "Free"
      : currency === "gbp"
      ? `£${price / 100}`
      : `${price / 100} ${currency.toUpperCase()}`;

  return (
    <div className="relative pt-6 rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-white to-primary/5 p-6 shadow-lg shadow-primary/10">
      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
        <span className="inline-flex items-center rounded-full border-2 border-primary bg-primary px-3 py-0.5 text-xs font-semibold text-white shadow-sm">
          Popular
        </span>
      </div>
      <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{name}</h2>
        <p className="text-sm text-gray-600 mb-4">
          with {trialDays} day free trial
        </p>
        <p className="text-4xl font-bold text-gray-900 mb-6">
          {formattedPrice}{" "}
          <span className="text-xl font-normal text-gray-600">
            / {interval}
          </span>
        </p>
        <ul className="space-y-4 mb-8">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <Check className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700 font-medium">{feature}</span>
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
    </div>
  );
}
