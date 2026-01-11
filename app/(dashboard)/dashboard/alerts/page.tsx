import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getTeamForUser, getLatestProducts, getRecentNewArrivals } from '@/lib/db/queries';

function formatDateTime(value: Date | null) {
  if (!value) return '—';
  return value.toLocaleString();
}

function formatProductDisplayName(rawName: string) {
  const cleanedName = rawName
    .trim()
    .split(',')
    .at(0)
    ?.replaceAll('-', ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleanedName ?? rawName;
}

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

function recentArrivalsMatchTopOfLatestProducts(
  recentArrivals: Array<{
    productName: string;
    productUrl: string;
    productImageUrl: string | null;
  }>,
  latestProducts: Array<{
    name: string;
    url: string;
    imageUrl: string | null;
  }>
) {
  if (recentArrivals.length === 0) return false;
  if (latestProducts.length === 0) return false;
  if (recentArrivals.length > latestProducts.length) return false;

  return recentArrivals.every((arrival, index) => {
    const product = latestProducts[index];
    if (!product) return false;

    return (
      arrival.productUrl === product.url &&
      arrival.productName === product.name &&
      arrival.productImageUrl === product.imageUrl
    );
  });
}

export default async function AlertsPage() {
  const team = await getTeamForUser();
  if (!team) {
    return null;
  }

  const latestProducts = await getLatestProducts();
  const recentArrivals = await getRecentNewArrivals();
  const shouldHideLatestProductsSection = recentArrivalsMatchTopOfLatestProducts(
    recentArrivals,
    latestProducts
  );

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">
        New Jellycat Alerts
      </h1>

      {recentArrivals.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Recent New Arrivals</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {recentArrivals.map((arrival) => (
                <li
                  key={arrival.id}
                  className="flex items-center justify-between gap-3 border border-gray-200 rounded-lg p-3 bg-white"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {arrival.productImageUrl && (
                      <img
                        src={arrival.productImageUrl}
                        alt={formatProductDisplayName(arrival.productName)}
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {formatProductDisplayName(arrival.productName)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Detected {formatRelativeTime(arrival.detectedAt)}
                      </p>
                    </div>
                  </div>
                  <a href={arrival.productUrl} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {!shouldHideLatestProductsSection && (
        <Card>
          <CardHeader>
            <CardTitle>Latest Products on /new</CardTitle>
          </CardHeader>
          <CardContent>
            {latestProducts.length === 0 ? (
              <p className="text-sm text-gray-600">
                No products scraped yet. The first check will populate this list.
              </p>
            ) : (
              <ul className="space-y-3">
                {latestProducts.map((product) => (
                  <li
                    key={product.id}
                    className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border border-gray-200 rounded-lg p-4 bg-white"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {product.imageUrl && (
                        <img
                          src={product.imageUrl}
                          alt={formatProductDisplayName(product.name)}
                          className="w-14 h-14 object-cover rounded"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {formatProductDisplayName(product.name)}
                        </p>
                        <p className="text-xs text-gray-600">
                          Last seen: {formatDateTime(product.lastCheckedAt)}
                        </p>
                      </div>
                    </div>

                    <a href={product.url} target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
