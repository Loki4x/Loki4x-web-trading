export interface CotHighlight {
  label: string;
  netChangePct: number;
}

// Watchlist instrumen yang relevan buat trader forex/index/komoditas.
// "pattern" dicocokkan (contains, case-insensitive) ke market_and_exchange_names
// dari data resmi CFTC, karena nama pasar CFTC suka beda-beda dikit formatnya.
const WATCHLIST: { pattern: string; label: string }[] = [
  { pattern: "EURO FX", label: "EUR" },
  { pattern: "JAPANESE YEN", label: "JPY" },
  { pattern: "BRITISH POUND", label: "GBP" },
  { pattern: "SWISS FRANC", label: "CHF" },
  { pattern: "CANADIAN DOLLAR", label: "CAD" },
  { pattern: "AUSTRALIAN DOLLAR", label: "AUD" },
  { pattern: "NZ DOLLAR", label: "NZD" },
  { pattern: "USD INDEX", label: "USD" },
  { pattern: "GOLD", label: "GOLD" },
  { pattern: "SILVER", label: "SILVER" },
  { pattern: "COPPER", label: "COPPER" },
  { pattern: "WTI-PHYSICAL", label: "USOIL" },
  { pattern: "E-MINI S&P 500", label: "SPX" },
  { pattern: "NASDAQ MINI", label: "NASDAQ" },
  { pattern: "DJIA", label: "DOW" },
  { pattern: "NIKKEI", label: "NIKKEI" },
  { pattern: "RUSSELL", label: "RUSSELL" },
];

const CFTC_BASE = "https://publicreporting.cftc.gov/resource/jun7-fc8e.json"; // Legacy Futures Only report — resmi, gratis, no API key

interface CftcRow {
  market_and_exchange_names?: string;
  change_in_noncomm_long_all?: string;
  change_in_noncomm_short_all?: string;
  open_interest_all?: string;
}

/**
 * Ambil laporan CFTC Commitment of Traders minggu terbaru, lalu hitung
 * "net change %" posisi non-commercial (spekulan besar) buat tiap instrumen
 * di watchlist. Diterbitkan CFTC tiap Jumat, jadi cache 6 jam sudah cukup.
 */
export async function getCotHighlights(): Promise<{
  positive: CotHighlight[];
  negative: CotHighlight[];
  reportDate: string | null;
}> {
  try {
    const latestRes = await fetch(`${CFTC_BASE}?$select=max(report_date_as_yyyy_mm_dd) as latest`, {
      next: { revalidate: 21600 }, // 6 jam
    });
    if (!latestRes.ok) return { positive: [], negative: [], reportDate: null };
    const latestJson = await latestRes.json();
    const latestDate: string | undefined = latestJson?.[0]?.latest;
    if (!latestDate) return { positive: [], negative: [], reportDate: null };

    const dateOnly = latestDate.slice(0, 10);
    const rowsRes = await fetch(
      `${CFTC_BASE}?$where=report_date_as_yyyy_mm_dd='${dateOnly}T00:00:00.000'&$limit=5000&$select=market_and_exchange_names,change_in_noncomm_long_all,change_in_noncomm_short_all,open_interest_all`,
      { next: { revalidate: 21600 } }
    );
    if (!rowsRes.ok) return { positive: [], negative: [], reportDate: dateOnly };
    const rows = (await rowsRes.json()) as CftcRow[];

    const results: CotHighlight[] = [];
    const usedLabels = new Set<string>();

    for (const { pattern, label } of WATCHLIST) {
      if (usedLabels.has(label)) continue;
      const match = rows.find((r) => (r.market_and_exchange_names ?? "").toUpperCase().includes(pattern));
      if (!match) continue;

      const changeLong = Number(match.change_in_noncomm_long_all ?? 0);
      const changeShort = Number(match.change_in_noncomm_short_all ?? 0);
      const openInterest = Number(match.open_interest_all ?? 0);
      if (!openInterest) continue;

      const netChangePct = ((changeLong - changeShort) / openInterest) * 100;
      results.push({ label, netChangePct: Math.round(netChangePct * 10) / 10 });
      usedLabels.add(label);
    }

    const sorted = [...results].sort((a, b) => b.netChangePct - a.netChangePct);
    const positive = sorted.filter((r) => r.netChangePct > 0).slice(0, 3);
    const negative = sorted
      .filter((r) => r.netChangePct < 0)
      .slice(-3)
      .reverse();

    return { positive, negative, reportDate: dateOnly };
  } catch {
    return { positive: [], negative: [], reportDate: null };
  }
}
