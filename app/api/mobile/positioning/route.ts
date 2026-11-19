import { mobileTierAuth } from "@/lib/mobile-auth";
import { getRetailSentiment, mergeRetailSentiment } from "@/lib/myfxbook";

export const dynamic = "force-dynamic";

// GET /api/mobile/positioning → sentimen retail (Myfxbook otomatis + data manual admin). Khusus VIP.
export async function GET(request: Request) {
  const auth = await mobileTierAuth(request, "VIP");
  if (auth instanceof Response) return auth;
  const [{ data: manualRows }, automatic] = await Promise.all([
    auth.supabase.from("positioning").select("symbol, long_percent, short_percent, updated_at"),
    getRetailSentiment(),
  ]);
  const automaticSymbols = new Set(automatic.map((a) => a.symbol));
  const items = mergeRetailSentiment(automatic, manualRows ?? []).map((m) => {
    const manual = (manualRows ?? []).find((r) => r.symbol.toUpperCase() === m.symbol);
    return {
      symbol: m.symbol,
      long_percent: m.longPercent,
      short_percent: m.shortPercent,
      source: automaticSymbols.has(m.symbol) ? "auto" : "manual",
      updated_at: manual?.updated_at ?? null,
    };
  });
  return Response.json({ items });
}
