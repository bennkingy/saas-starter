import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { formatProductName } from "@/lib/utils";

function formatRelativeTime(date: Date) {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

type RecentArrival = {
  id: number;
  detectedAt: Date;
  notifiedAt: Date | null;
  productId: number;
  productName: string;
  productUrl: string;
  productImageUrl: string | null;
};

type LatestAlertsProps = {
  recentArrivals: RecentArrival[];
  title?: string;
  description?: string;
  variant?: "default" | "compact";
};

export function LatestAlerts({
  recentArrivals,
  title = "Latest alerts",
  description = "The most recent Jellycats we detected on the New page.",
  variant = "default",
}: LatestAlertsProps) {
  const isCompact = variant === "compact";
  const headingSize = "text-3xl sm:text-4xl";
  const descriptionSize = "text-base";
  const descriptionMargin = "mt-2";
  const sectionPadding = isCompact
    ? "mt-14 border-t border-gray-200 pt-12"
    : "py-16 bg-white w-full border-t border-gray-100";
  const gridMargin = isCompact ? "mt-6" : "mt-10";
  const emptyStateMargin = isCompact ? "mt-6" : "mt-10";

  return (
    <section className={sectionPadding}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className={`${headingSize} font-bold text-gray-900`}>
              {title}
            </h2>
            <p
              className={`${descriptionMargin} ${descriptionSize} text-gray-600`}
            >
              {description}
            </p>
          </div>
          <a href="/dashboard/alerts">
            <Button variant="outline" className="rounded-full cursor-pointer">
              View all alerts
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </a>
        </div>

        {recentArrivals.length > 0 ? (
          <div
            className={`${gridMargin} grid gap-6 sm:grid-cols-2 lg:grid-cols-4`}
          >
            {recentArrivals.map((arrival) => (
              <a
                key={arrival.id}
                href={arrival.productUrl}
                target="_blank"
                rel="noreferrer"
                className="group relative isolate overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 before:absolute before:inset-0 before:z-0 before:origin-bottom before:scale-y-0 before:bg-primary before:transition-transform before:duration-300 before:content-[''] hover:before:scale-y-100"
              >
                <div className="relative z-10 aspect-square w-full overflow-hidden rounded-xl bg-gray-50">
                  {arrival.productImageUrl ? (
                    <img
                      src={arrival.productImageUrl}
                      alt={formatProductName(arrival.productName)}
                      className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="h-full w-full bg-gray-100" />
                  )}
                </div>
                <div className="relative z-10 mt-3">
                  <p className="font-medium text-gray-900 line-clamp-2">
                    {formatProductName(arrival.productName)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Detected {formatRelativeTime(arrival.detectedAt)}
                  </p>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div
            className={`${emptyStateMargin} rounded-2xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-700`}
          >
            No alerts yet — once the first scan runs, you'll see the latest 4
            here.
          </div>
        )}
      </div>
    </section>
  );
}
