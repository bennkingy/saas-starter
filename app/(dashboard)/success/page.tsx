import { Button } from '@/components/ui/button';

export default function SuccessPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="bg-white border border-gray-200 rounded-xl p-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          Subscription successful
        </h1>
        <p className="mt-2 text-gray-600">
          You’re all set. Configure your notification preferences and start
          tracking Jellycat products.
        </p>

        <div className="mt-6 flex gap-3">
          <a href="/dashboard/alerts">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Go to alerts
            </Button>
          </a>
          <a href="/dashboard/preferences">
            <Button variant="outline">Notification settings</Button>
          </a>
        </div>
      </div>
    </main>
  );
}

