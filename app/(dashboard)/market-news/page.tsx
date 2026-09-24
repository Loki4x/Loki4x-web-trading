import { getMarketNews } from "@/lib/market-news";
import { MarketNewsClient } from "@/components/market-news/MarketNewsClient";
import { getCurrentUserTier, hasAccess } from "@/lib/tier";
import { AccessDenied } from "@/components/ui/AccessDenied";

export default async function MarketNewsPage() {
  const tier = await getCurrentUserTier();
  if (!hasAccess(tier, "MEMBERSHIP")) {
    return <AccessDenied requiredTier="MEMBERSHIP" />;
  }

  const news = await getMarketNews();

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">Fundamental Pasar</h1>
        <p className="text-body-sm text-text-secondary">
          Berita dari Investing.com &amp; FXStreet, diperbarui otomatis setiap ada berita baru.
        </p>
      </div>

      <MarketNewsClient news={news} />
    </main>
  );
}
