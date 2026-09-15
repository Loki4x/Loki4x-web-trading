import { EconomicCalendarWidget } from "@/components/news/EconomicCalendarWidget";

export default function NewsPage() {
  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">Economic Calendar &amp; Market News</h1>
        <p className="text-body-sm text-text-secondary">
          Powered by TradingView — update otomatis secara real-time.
        </p>
      </div>

      <div className="card !p-2">
        <EconomicCalendarWidget />
      </div>
    </main>
  );
}
