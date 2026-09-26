export interface RetailSentimentRow {
  symbol: string;
  longPercent: number;
  shortPercent: number;
}

const MYFXBOOK_BASE = "https://www.myfxbook.com/api";

interface MyfxbookOutlookResponse {
  error: boolean;
  message?: string;
  symbols?: {
    name: string;
    longPercentage: number;
    shortPercentage: number;
  }[];
}

async function loginMyfxbook(forceFresh = false): Promise<string | null> {
  const email = process.env.MYFXBOOK_EMAIL;
  const password = process.env.MYFXBOOK_PASSWORD;
  if (!email || !password) return null;

  try {
    const params = new URLSearchParams({ email, password });
    const res = await fetch(`${MYFXBOOK_BASE}/login.json?${params.toString()}`, {
      // Sesi biasanya awet cukup lama, cache 30 menit; kalau ternyata sudah
      // kedaluwarsa, getRetailSentiment() akan retry pakai forceFresh=true.
      next: forceFresh ? undefined : { revalidate: 1800 },
      cache: forceFresh ? "no-store" : undefined,
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;
    return (data.session as string) ?? null;
  } catch {
    return null;
  }
}

async function fetchOutlook(session: string): Promise<MyfxbookOutlookResponse | null> {
  try {
    const res = await fetch(`${MYFXBOOK_BASE}/get-community-outlook.json?session=${session}`, {
      next: { revalidate: 900 }, // Myfxbook update datanya tiap ~15 menit
    });
    if (!res.ok) return null;
    return (await res.json()) as MyfxbookOutlookResponse;
  } catch {
    return null;
  }
}

/**
 * Ambil retail sentiment (long/short %) dari Myfxbook Community Outlook —
 * otomatis, real-time dari trader retail beneran. Butuh MYFXBOOK_EMAIL dan
 * MYFXBOOK_PASSWORD di environment variables (akun gratis di myfxbook.com).
 *
 * Kalau env var belum diisi, atau login/API gagal, return array kosong
 * (nggak throw) — supaya halaman tetap bisa fallback ke data manual admin.
 */
export async function getRetailSentiment(): Promise<RetailSentimentRow[]> {
  const session = await loginMyfxbook();
  if (!session) return [];

  let data = await fetchOutlook(session);

  if (!data || data.error) {
    // Sesi kemungkinan kedaluwarsa — login ulang paksa (skip cache) lalu retry sekali.
    const freshSession = await loginMyfxbook(true);
    if (!freshSession) return [];
    data = await fetchOutlook(freshSession);
  }

  if (!data || data.error || !Array.isArray(data.symbols)) return [];

  return data.symbols
    .filter((s) => s.name)
    .map((s) => ({
      symbol: s.name.toUpperCase(),
      longPercent: Math.round(Number(s.longPercentage) * 10) / 10,
      shortPercent: Math.round(Number(s.shortPercentage) * 10) / 10,
    }));
}

/**
 * Gabungkan data otomatis (Myfxbook) dengan data manual (tabel `positioning`
 * yang diisi admin) — dipakai buat simbol yang nggak di-cover Myfxbook,
 * misalnya index (NASDAQ, DOW, dll). Kalau simbol yang sama ada di keduanya,
 * data otomatis yang menang karena lebih real-time.
 */
export function mergeRetailSentiment(
  automatic: RetailSentimentRow[],
  manual: { symbol: string; long_percent: number; short_percent: number }[]
): RetailSentimentRow[] {
  const bySymbol = new Map<string, RetailSentimentRow>();

  for (const m of manual) {
    bySymbol.set(m.symbol.toUpperCase(), {
      symbol: m.symbol.toUpperCase(),
      longPercent: m.long_percent,
      shortPercent: m.short_percent,
    });
  }
  // Data otomatis menimpa data manual kalau simbolnya sama
  for (const a of automatic) {
    bySymbol.set(a.symbol, a);
  }

  return Array.from(bySymbol.values());
}
