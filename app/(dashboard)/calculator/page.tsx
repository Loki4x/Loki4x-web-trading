import { LotCalculator, type LotInitial } from "@/components/calculator/LotCalculator";
import { getCurrentUserTier, hasAccess } from "@/lib/tier";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { INSTRUMENTS } from "@/lib/lot-instruments";
import { getT } from "@/lib/i18n/server";

const num = (v: unknown) => (typeof v === "string" && Number.isFinite(Number(v)) && Number(v) > 0 ? v : null);

/** Baca isian awal dari link tombol "Hitung lot" di halaman Signals; kalau tidak valid, kalkulator memakai nilai bawaan. */
function parseInitial(sp: Record<string, string | string[] | undefined>): LotInitial | undefined {
  const symbol = typeof sp.symbol === "string" ? sp.symbol.toUpperCase() : "";
  if (!INSTRUMENTS.some((i) => i.symbol === symbol && i.symbol !== "CUSTOM")) return undefined;
  const side = sp.side === "BUY" ? "LONG" : sp.side === "SELL" ? "SHORT" : null;
  const entry = num(sp.entry);
  const sl = num(sp.sl);
  if (!side || !entry || !sl) return undefined;
  return { symbol, direction: side, entry, sl, tp: num(sp.tp) };
}

export default async function CalculatorPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const { t } = await getT();
  const tier = await getCurrentUserTier();
  if (!hasAccess(tier, "MEMBERSHIP")) {
    return <AccessDenied requiredTier="MEMBERSHIP" />;
  }

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">Lot Calculator</h1>
        <p className="text-body-sm text-text-secondary">{t("Hitung ukuran lot berdasarkan manajemen risiko kamu.")}</p>
      </div>

      <LotCalculator initial={parseInitial(searchParams)} />
    </main>
  );
}
