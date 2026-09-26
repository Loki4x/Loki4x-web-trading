import { categorizeSymbol, type AssetCategory } from "@/lib/asset-category";

export interface CotAssetRow {
  label: string;
  category: AssetCategory;
  long: number;
  short: number;
  longPct: number;
  shortPct: number;
  netPos: number;
  openInterest: number;
  deltaLong: number;
  deltaShort: number;
  deltaOpenInterest: number;
  netChangePct: number;
}

export interface CotHistoryPoint {
  date: string; // ISO
  long: number;
  short: number;
  longPct: number;
  netPos: number;
  deltaLong: number;
  deltaShort: number;
  netChangePct: number;
}

// Watchlist instrumen yang relevan buat trader forex/index/komoditas.
// "pattern" dicocokkan (contains, case-insensitive) ke market_and_exchange_names
// dari data resmi CFTC, karena nama pasar CFTC suka beda-beda dikit formatnya.
export const COT_WATCHLIST: { pattern: string; label: string }[] = [
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
  { pattern: "BITCOIN", label: "BITCOIN" },
];

const CFTC_BASE = "https://publicreporting.cftc.gov/resource/jun7-fc8e.json"; // Legacy Futures Only report — resmi, gratis, no API key

interface CftcRow {
  report_date_as_yyyy_mm_dd?: string;
  market_and_exchange_names?: string;
  noncomm_positions_long_all?: string;
  noncomm_positions_short_all?: string;
  change_in_noncomm_long_all?: string;
  change_in_noncomm_short_all?: string;
  open_interest_all?: string;
  change_in_open_interest_all?: string;
}

function toRow(label: string, r: CftcRow): CotAssetRow | null {
  const long = Number(r.noncomm_positions_long_all ?? 0);
  const short = Number(r.noncomm_positions_short_all ?? 0);
  const openInterest = Number(r.open_interest_all ?? 0);
  if (!openInterest) return null;

  const deltaLong = Number(r.change_in_noncomm_long_all ?? 0);
  const deltaShort = Number(r.change_in_noncomm_short_all ?? 0);
  const deltaOpenInterest = Number(r.change_in_open_interest_all ?? deltaLong - deltaShort);
  const total = long + short || 1;

  return {
    label,
    category: categorizeSymbol(label),
    long,
    short,
    longPct: Math.round((long / total) * 1000) / 10,
    shortPct: Math.round((short / total) * 1000) / 10,
    netPos: long - short,
    openInterest,
    deltaLong,
    deltaShort,
    deltaOpenInterest,
    netChangePct: Math.round(((deltaLong - deltaShort) / openInterest) * 1000) / 10,
  };
}

/**
 * Snapshot minggu terbaru buat SEMUA aset di watchlist — dipakai di
 * dashboard COT penuh (tabel, bar chart, kartu ringkasan).
 */
export async function getCotSnapshot(): Promise<{ rows: CotAssetRow[]; reportDate: string | null }> {
  try {
    const latestRes = await fetch(`${CFTC_BASE}?$select=max(report_date_as_yyyy_mm_dd) as latest`, {
      next: { revalidate: 21600 }, // 6 jam
    });
    if (!latestRes.ok) return { rows: [], reportDate: null };
    const latestJson = await latestRes.json();
    const latestDate: string | undefined = latestJson?.[0]?.latest;
    if (!latestDate) return { rows: [], reportDate: null };

    const dateOnly = latestDate.slice(0, 10);
    const params = new URLSearchParams({
      $where: `report_date_as_yyyy_mm_dd='${dateOnly}T00:00:00.000'`,
      $limit: "5000",
      $select:
        "market_and_exchange_names,noncomm_positions_long_all,noncomm_positions_short_all,change_in_noncomm_long_all,change_in_noncomm_short_all,open_interest_all,change_in_open_interest_all",
    });
    const rowsRes = await fetch(`${CFTC_BASE}?${params.toString()}`, { next: { revalidate: 21600 } });
    if (!rowsRes.ok) return { rows: [], reportDate: dateOnly };
    const rawRows = (await rowsRes.json()) as CftcRow[];

    const rows: CotAssetRow[] = [];
    const used = new Set<string>();

    for (const { pattern, label } of COT_WATCHLIST) {
      if (used.has(label)) continue;
      const match = rawRows.find((r) => (r.market_and_exchange_names ?? "").toUpperCase().includes(pattern));
      if (!match) continue;
      const row = toRow(label, match);
      if (row) {
        rows.push(row);
        used.add(label);
      }
    }

    return { rows, reportDate: dateOnly };
  } catch {
    return { rows: [], reportDate: null };
  }
}

/**
 * Histori mingguan (default 1 tahun / 52 minggu) buat satu aset spesifik —
 * dipakai di halaman detail/history per aset.
 */
export async function getCotHistory(label: string, weeksBack = 52): Promise<CotHistoryPoint[]> {
  const watch = COT_WATCHLIST.find((w) => w.label === label);
  if (!watch) return [];

  try {
    const params = new URLSearchParams({
      $where: `upper(market_and_exchange_names) like '%${watch.pattern.toUpperCase()}%'`,
      $order: "report_date_as_yyyy_mm_dd DESC",
      $limit: String(weeksBack),
      $select:
        "report_date_as_yyyy_mm_dd,noncomm_positions_long_all,noncomm_positions_short_all,change_in_noncomm_long_all,change_in_noncomm_short_all,open_interest_all",
    });
    const res = await fetch(`${CFTC_BASE}?${params.toString()}`, { next: { revalidate: 21600 } });
    if (!res.ok) return [];
    const rawRows = (await res.json()) as CftcRow[];

    const points: CotHistoryPoint[] = rawRows
      .map((r) => {
        const long = Number(r.noncomm_positions_long_all ?? 0);
        const short = Number(r.noncomm_positions_short_all ?? 0);
        const total = long + short || 1;
        const deltaLong = Number(r.change_in_noncomm_long_all ?? 0);
        const deltaShort = Number(r.change_in_noncomm_short_all ?? 0);
        const openInterest = Number(r.open_interest_all ?? 0) || 1;

        return {
          date: r.report_date_as_yyyy_mm_dd ? r.report_date_as_yyyy_mm_dd.slice(0, 10) : "",
          long,
          short,
          longPct: Math.round((long / total) * 1000) / 10,
          netPos: long - short,
          deltaLong,
          deltaShort,
          netChangePct: Math.round(((deltaLong - deltaShort) / openInterest) * 1000) / 10,
        };
      })
      .filter((p) => p.date);

    // urutkan lama -> baru buat chart, tapi tabel nanti yang urus urutan tampilnya sendiri
    return points.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch {
    return [];
  }
}
