import { checkoutAction } from "@/lib/payments/actions";
import { Check } from "lucide-react";
import { getStripePrices, getStripeProducts } from "@/lib/payments/stripe";
import { SubmitButton } from "./submit-button";
import Link from "next/link";
import { getRecentNewArrivals, getUser } from "@/lib/db/queries";
import { LatestAlerts } from "@/components/site/latest-alerts";

export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  const user = await getUser();
  const recentArrivals = await getRecentNewArrivals(4);
  const [prices, products] = await Promise.all([
    getStripePrices(),
    getStripeProducts(),
  ]);

  const proPlan = products.find((product) => 
    product.name.trim().toLowerCase() === "plus"
  );

  const proPrice = prices.find((price) => price.productId === proPlan?.id);

  // Debug: Log what we found (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('Found products:', products.map(p => ({ name: p.name, id: p.id })));
    console.log('Found prices:', prices.map(p => ({ productId: p.productId, id: p.id, amount: p.unitAmount })));
    console.log('Pro plan found:', proPlan ? { name: proPlan.name, id: proPlan.id } : null);
    console.log('Pro price found:', proPrice ? { id: proPrice.id, amount: proPrice.unitAmount } : null);
  }

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
          name={proPlan?.name || "Plus"}
          price={proPrice?.unitAmount ?? 300}
          currency={(proPrice?.currency ?? "gbp").toLowerCase()}
          interval={proPrice?.interval || "month"}
          trialDays={7}
          features={["Everything in free, plus:", "SMS alerts"]}
          priceId={proPrice?.id}
          isConfigured={Boolean(proPlan?.id && proPrice?.id)}
          hasProduct={Boolean(proPlan?.id)}
          hasPrice={Boolean(proPrice?.id)}
          allProducts={products.map(p => p.name)}
          allPrices={prices.length}
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
  hasProduct,
  hasPrice,
  allProducts,
  allPrices,
}: {
  name: string;
  price: number;
  currency: string;
  interval: string;
  trialDays: number;
  features: string[];
  priceId?: string;
  isConfigured: boolean;
  hasProduct: boolean;
  hasPrice: boolean;
  allProducts: string[];
  allPrices: number;
}) {
  const formattedPrice =
    price === 0
      ? "Free"
      : currency === "gbp"
      ? `£${price / 100}`
      : `${price / 100} ${currency.toUpperCase()}`;

  const getErrorMessage = () => {
    if (!hasProduct) {
      const productsList = allProducts.length > 0 
        ? ` Found products: ${allProducts.join(', ')}.` 
        : ' No products found.';
      return `Plus product not found in Stripe.${productsList} Make sure: 1) You have a product named 'Plus' (case-insensitive) that is active, 2) Your STRIPE_SECRET_KEY matches the mode (test/live) where the product was created, 3) The product is in the same Stripe account as your API key.`;
    }
    if (!hasPrice) {
      return `Plus product found but no active recurring price configured. Found ${allPrices} recurring price(s) total. Please add a recurring price to your Plus product in Stripe.`;
    }
    return "Plus plan is not configured in Stripe yet.";
  };

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
            {getErrorMessage()}
          </div>
        )}
      </div>
    </div>
  );
}
