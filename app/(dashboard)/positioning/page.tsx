import { createClient } from "@/lib/supabase/server";
import { getRetailSentiment, mergeRetailSentiment } from "@/lib/myfxbook";
import { RetailBiasClient, type RetailBiasItem } from "@/components/positioning/RetailBiasClient";
import { getCurrentUserTier, hasAccess } from "@/lib/tier";
import { AccessDenied } from "@/components/ui/AccessDenied";

export default async function PositioningPage() {
  const tier = await getCurrentUserTier();
  if (!hasAccess(tier, "VIP")) {
    return <AccessDenied requiredTier="VIP" />;
  }

  const supabase = await createClient();
  const [{ data: manualRows }, automatic] = await Promise.all([
    supabase.from("positioning").select("symbol, long_percent, short_percent, updated_at"),
    getRetailSentiment(),
  ]);

  const automaticSymbols = new Set(automatic.map((a) => a.symbol));
  const merged = mergeRetailSentiment(automatic, manualRows ?? []);

  const items: RetailBiasItem[] = merged.map((m) => {
    const manual = (manualRows ?? []).find((r) => r.symbol.toUpperCase() === m.symbol);
    return {
      symbol: m.symbol,
      long_percent: m.longPercent,
      short_percent: m.shortPercent,
      source: automaticSymbols.has(m.symbol) ? "auto" : "manual",
      updated_at: manual?.updated_at,
    };
  });

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">Retail Bias</h1>
        <p className="text-body-sm text-text-secondary">
          Sentimen retail (long vs short) — dibaca kontrarian. Ditandai <span className="font-semibold text-success">Live</span> kalau
          otomatis dari Myfxbook, sisanya data manual admin.
        </p>
      </div>

      <RetailBiasClient items={items} />
    </main>
  );
}
