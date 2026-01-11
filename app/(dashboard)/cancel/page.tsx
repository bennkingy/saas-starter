import { Button } from '@/components/ui/button';

export default function CancelPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="bg-white border border-gray-200 rounded-xl p-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          Checkout canceled
        </h1>
        <p className="mt-2 text-gray-600">
          No worries — you can pick a plan and try again anytime.
        </p>

        <div className="mt-6">
          <a href="/pricing">
            <Button variant="outline">Back to pricing</Button>
          </a>
        </div>
      </div>
    </main>
  );
}

