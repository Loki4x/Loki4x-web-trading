import { unstable_cache } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { buildGrowthSeries, computeSignalStats, type GrowthPoint, type SignalStats } from "@/lib/signal-metrics";
import type { Signal } from "@/lib/types";

export interface MonthlyReturn {
  month: string; // "2026-09"
  returnPercent: number;
}

export interface PublicTrackRecord {
  stats: SignalStats;
  growth: GrowthPoint[];
  monthly: MonthlyReturn[];
  closedCount: number;
  firstSignalAt: string | null;
}

const monthFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit" });

export function monthlyReturns(points: GrowthPoint[]): MonthlyReturn[] {
  const lastMultiplierByMonth = new Map<string, number>();
  for (const p of points) {
    lastMultiplierByMonth.set(monthFmt.format(new Date(p.date)), 1 + p.growthPercent / 100);
  }
  let previous = 1;
  return Array.from(lastMultiplierByMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, multiplier]) => {
      const result = { month, returnPercent: (multiplier / previous - 1) * 100 };
      previous = multiplier;
      return result;
    });
}

/**
 * Data RINGKASAN untuk halaman publik. Hanya angka agregat — tidak ada simbol, harga,
 * catatan, atau gambar sinyal (itu konten berbayar). Memakai service client karena
 * pengunjung belum login (RLS tabel signals hanya untuk VIP+); hasilnya di-cache 5 menit.
 */
export const getPublicTrackRecord = unstable_cache(
  async (): Promise<PublicTrackRecord> => {
    const service = createServiceClient();
    const rows: Signal[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await service
        .from("signals")
        .select("id, symbol, side, entry_price, current_price, current_price_at, take_profit, stop_loss, status, result_pips, risk_percent, posted_at, closed_at")
        .order("posted_at", { ascending: true })
        .range(from, from + 999);
      if (error) throw new Error(error.message);
      rows.push(...((data ?? []) as unknown as Signal[]));
      if (!data || data.length < 1000) break;
    }

    const growth = buildGrowthSeries(rows);
    const stats = computeSignalStats(rows);
    const closedCount = rows.filter((s) => ["TP", "SL", "PARTIAL"].includes(s.status)).length;

    return {
      stats,
      growth,
      monthly: monthlyReturns(growth),
      closedCount,
      firstSignalAt: rows.length > 0 ? rows[0].posted_at : null,
    };
  },
  ["public-track-record-v1"],
  { revalidate: 300 }
);
