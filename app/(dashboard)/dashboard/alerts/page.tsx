import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getTeamForUser, getAllProductItems } from "@/lib/db/queries";

function formatDateTime(value: Date | null) {
  if (!value) return "—";
  return value.toLocaleString();
}

function formatProductDisplayName(rawName: string) {
  const cleanedName = rawName
    .trim()
    .split(",")
    .at(0)
    ?.replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleanedName ?? rawName;
}

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

function formatDateGroup(date: Date) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const itemDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
  const diffDays = Math.floor(
    (today.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

function groupItemsByDate<T extends { createdDate: Date }>(items: T[]) {
  const grouped = new Map<string, T[]>();

  items.forEach((item) => {
    const dateKey = item.createdDate.toISOString().split("T")[0];
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(item);
  });

  return Array.from(grouped.entries())
    .map(([dateKey, items]) => ({
      date: new Date(dateKey),
      items,
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

export default async function AlertsPage() {
  const team = await getTeamForUser();
  if (!team) {
    return null;
  }

  const allItems = await getAllProductItems();
  const groupedItems = groupItemsByDate(allItems);

  return (
    <section className="flex-1 p-4 lg:p-8 w-full min-w-0 overflow-x-hidden">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">
        Alerts
      </h1>

      {groupedItems.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600">
              No products scraped yet. The first check will populate this list.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>Newest Arrivals</CardTitle>
          </CardHeader>
          <CardContent className="w-full min-w-0 overflow-hidden">
            <div className="space-y-8 w-full min-w-0">
              {groupedItems.map((group) => (
                <div key={group.date.toISOString()} className="w-full min-w-0">
                  <h2 className="text-sm font-semibold text-gray-700 mb-4">
                    {formatDateGroup(group.date)}
                  </h2>
                  <ul className="space-y-3 w-full min-w-0">
                    {group.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-3 border border-gray-200 rounded-lg p-3 bg-white w-full min-w-0"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                          {item.imageUrl && (
                            <img
                              src={item.imageUrl}
                              alt={formatProductDisplayName(item.name)}
                              className="w-12 h-12 object-cover rounded flex-shrink-0"
                            />
                          )}
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <p className="font-medium text-gray-900 truncate">
                              {formatProductDisplayName(item.name)}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {item.lastCheckedAt &&
                              item.lastCheckedAt.getTime() !==
                                item.createdDate.getTime()
                                ? `Last seen: ${formatDateTime(
                                    item.lastCheckedAt
                                  )}`
                                : `Detected ${formatRelativeTime(
                                    item.createdDate
                                  )}`}
                            </p>
                          </div>
                        </div>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-shrink-0"
                        >
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
