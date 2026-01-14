import { NextResponse } from "next/server";
import { getAdminStats } from "@/lib/db/queries";
import { stripe } from "@/lib/payments/stripe";
import { db } from "@/lib/db/drizzle";
import { teams } from "@/lib/db/schema";
import { isNotNull } from "drizzle-orm";

export async function GET() {
  try {
    const stats = await getAdminStats();

    // Get revenue data from Stripe - only count invoices for subscriptions in our database
    const now = Math.floor(Date.now() / 1000);
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60;

    // Get all teams with Stripe customer IDs
    const teamsWithStripe = await db
      .select({ stripeCustomerId: teams.stripeCustomerId })
      .from(teams)
      .where(isNotNull(teams.stripeCustomerId));

    const customerIds = teamsWithStripe
      .map((t) => t.stripeCustomerId)
      .filter(Boolean) as string[];

    // Calculate revenue by day - only from our customers
    const revenueByDay = new Map<string, number>();
    let totalRevenue = 0;

    if (customerIds.length > 0) {
      // Fetch invoices for all customers
      const allInvoices = [];
      for (const customerId of customerIds) {
        try {
          const customerInvoices = await stripe.invoices.list({
            created: { gte: thirtyDaysAgo },
            limit: 100,
            customer: customerId,
          });
          allInvoices.push(...customerInvoices.data);
        } catch (error) {
          // Skip if customer doesn't exist in Stripe
          console.error(
            `Error fetching invoices for customer ${customerId}:`,
            error
          );
        }
      }

      allInvoices
        .filter((invoice) => {
          const customerId =
            typeof invoice.customer === "string"
              ? invoice.customer
              : invoice.customer?.id || "";

          // Only count paid invoices for our customers
          // Since we're only fetching invoices for customers with subscriptions,
          // all invoices should be subscription-related
          return invoice.status === "paid" && customerIds.includes(customerId);
        })
        .forEach((invoice) => {
          const date = new Date(invoice.created * 1000)
            .toISOString()
            .split("T")[0];
          const amount = invoice.amount_paid / 100; // Convert from cents
          revenueByDay.set(date, (revenueByDay.get(date) || 0) + amount);
          totalRevenue += amount;
        });
    }

    const revenueData = Array.from(revenueByDay.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Get all subscriptions to calculate MRR
    const subscriptions = await stripe.subscriptions.list({
      status: "active",
      limit: 100,
    });

    let monthlyRecurringRevenue = 0;
    subscriptions.data.forEach((sub) => {
      const item = sub.items.data[0];
      if (item?.price?.recurring?.interval === "month") {
        monthlyRecurringRevenue += (item.price.unit_amount || 0) / 100;
      }
    });

    return NextResponse.json({
      ...stats,
      totalRevenue,
      monthlyRecurringRevenue,
      revenueData,
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin stats" },
      { status: 500 }
    );
  }
}
