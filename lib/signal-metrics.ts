import type { Signal, SignalStatus } from "@/lib/types";
import { categorizeSymbol } from "@/lib/asset-category";

export const TERMINAL_STATUSES: SignalStatus[] = ["TP", "SL", "PARTIAL", "CANCEL", "MISS"];

export function isTerminalStatus(status: SignalStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export const SIGNAL_STATUS_LABEL: Record<SignalStatus, string> = {
  OPEN: "OPEN",
  HIT_ENTRY: "HIT ENTRY",
  TP: "TP",
  SL: "SL",
  PARTIAL: "PARTIAL",
  CANCEL: "CANCEL",
  MISS: "MISS",
};

export function signalStatusClass(status: SignalStatus): string {
  switch (status) {
    case "TP":
      return "bg-success-subtle text-success";
    case "SL":
      return "bg-error-subtle text-error";
    case "HIT_ENTRY":
      return "bg-info-subtle text-info";
    case "PARTIAL":
      return "bg-warning-subtle text-warning";
    case "CANCEL":
    case "MISS":
      return "bg-surface-2 text-text-muted";
    default:
      return "bg-surface-2 text-text-secondary"; // OPEN
  }
}

/**
 * R-multiple: seberapa jauh harga sudah bergerak dibanding jarak stop loss.
 * 1R = harga bergerak sejauh jarak entry->SL ke arah profit.
 * Dipakai untuk mensimulasikan kontribusi tiap sinyal ke pertumbuhan
 * portofolio, dengan asumsi risiko tetap sebesar `risk_percent` per sinyal
 * (default 2%, bisa diatur per sinyal).
 *
 * Return null kalau belum ada harga acuan (current_price) atau belum ada
 * stop loss (jarak risiko tidak diketahui).
 */
export function rMultiple(signal: Signal): number | null {
  if (signal.current_price === null || signal.stop_loss === null) return null;
  const riskDistance = Math.abs(signal.entry_price - signal.stop_loss);
  if (riskDistance === 0) return null;

  const priceMove =
    signal.side === "BUY"
      ? signal.current_price - signal.entry_price
      : signal.entry_price - signal.current_price;

  return priceMove / riskDistance;
}

/** P/L% murni dari pergerakan harga (dipakai untuk kolom Hasil di tabel posisi). */
export function livePercent(signal: Signal): number | null {
  if (signal.current_price === null) return null;
  const raw = ((signal.current_price - signal.entry_price) / signal.entry_price) * 100;
  return signal.side === "BUY" ? raw : -raw;
}

/**
 * Ukuran 1 pip (dalam harga) per simbol. Disamakan dengan kalkulator lot
 * (components/calculator/LotCalculator.tsx): XAUUSD 0.1, XAGUSD 0.001,
 * pair JPY 0.01, forex lain 0.0001, indeks & crypto 1.
 */
export function pipSizeFor(symbol: string): number {
  const s = symbol.toUpperCase();
  if (s === "XAUUSD" || s === "GOLD") return 0.1;
  if (s === "XAGUSD" || s === "SILVER") return 0.001;
  switch (categorizeSymbol(s)) {
    case "INDEX":
    case "CRYPTO":
      return 1;
    case "COMMODITY":
      return 0.01; // minyak, tembaga, dll.
    default:
      return s.includes("JPY") ? 0.01 : 0.0001;
  }
}

/** P/L dalam pips dari pergerakan harga (current_price vs entry_price). */
export function livePips(signal: Signal): number | null {
  if (signal.current_price === null) return null;
  const move =
    signal.side === "BUY"
      ? signal.current_price - signal.entry_price
      : signal.entry_price - signal.current_price;
  return move / pipSizeFor(signal.symbol);
}

/**
 * Nilai kolom Hasil di tabel posisi, dalam pips.
 * - TP/SL/PARTIAL: pakai result_pips yang diisi admin. Kalau kosong/0
 *   (admin tidak mengisi, tersimpan sebagai 0), hitung dari harga penutupan.
 * - Posisi aktif: pips berjalan dari current_price.
 */
export function signalResultPips(signal: Signal): number | null {
  const hasResult = signal.status === "TP" || signal.status === "SL" || signal.status === "PARTIAL";
  if (hasResult && signal.result_pips !== null && signal.result_pips !== 0) {
    return signal.result_pips;
  }
  return livePips(signal);
}

export interface GrowthPoint {
  date: string; // ISO datetime (closed_at)
  growthPercent: number; // % kumulatif sejak sinyal pertama ditutup
}

/**
 * Kurva pertumbuhan portofolio kumulatif dari sinyal yang sudah selesai
 * (TP/SL/PARTIAL), diurutkan berdasarkan tanggal ditutup. CANCEL & MISS
 * tidak dianggap sebagai posisi nyata sehingga tidak memengaruhi kurva.
 */
export function buildGrowthSeries(signals: Signal[]): GrowthPoint[] {
  const closedTrades = signals
    .filter((s): s is Signal & { closed_at: string } =>
      (s.status === "TP" || s.status === "SL" || s.status === "PARTIAL") && s.closed_at !== null
    )
    .sort((a, b) => new Date(a.closed_at).getTime() - new Date(b.closed_at).getTime());

  let multiplier = 1;
  const points: GrowthPoint[] = [];

  for (const s of closedTrades) {
    const r = rMultiple(s);
    if (r === null) continue;
    const riskPercent = s.risk_percent ?? 2;
    multiplier *= 1 + (r * riskPercent) / 100;
    points.push({ date: s.closed_at, growthPercent: (multiplier - 1) * 100 });
  }

  return points;
}

export interface SignalStats {
  totalGrowthPercent: number;
  monthGrowthPercent: number;
  winRate: number;
  wins: number;
  losses: number;
  maxDrawdownPercent: number;
  activeCount: number;
  totalPips: number;
  profitPips: number; // total pips dari sinyal TP (tanpa dikurangi SL)
  lossPips: number; // total pips kerugian dari sinyal SL (nilai positif)
}

export function computeSignalStats(signals: Signal[]): SignalStats {
  const growthSeries = buildGrowthSeries(signals);
  const totalGrowthPercent = growthSeries.length > 0 ? growthSeries[growthSeries.length - 1].growthPercent : 0;

  const now = new Date();
  const monthCutoff = new Date(now.getFullYear(), now.getMonth(), 1);
  const beforeMonth = growthSeries.filter((p) => new Date(p.date) < monthCutoff);
  const throughNow = growthSeries;
  const baseGrowth = beforeMonth.length > 0 ? beforeMonth[beforeMonth.length - 1].growthPercent : 0;
  const monthGrowthPercent = throughNow.length > 0 ? totalGrowthPercent - baseGrowth : 0;

  let peakMultiplier = 1;
  let maxDrawdownPercent = 0;
  for (const p of growthSeries) {
    const m = 1 + p.growthPercent / 100;
    if (m > peakMultiplier) peakMultiplier = m;
    const drawdown = ((m - peakMultiplier) / peakMultiplier) * 100;
    if (drawdown < maxDrawdownPercent) maxDrawdownPercent = drawdown;
  }

  const wins = signals.filter((s) => {
    if (s.status === "TP") return true;
    if (s.status === "PARTIAL") return (rMultiple(s) ?? 0) > 0;
    return false;
  }).length;

  const losses = signals.filter((s) => {
    if (s.status === "SL") return true;
    if (s.status === "PARTIAL") return (rMultiple(s) ?? 0) <= 0;
    return false;
  }).length;

  const winRate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;

  const totalPips = signals.reduce((sum, s) => sum + (s.result_pips ?? 0), 0);
  const profitPips = signals
    .filter((s) => s.status === "TP")
    .reduce((sum, s) => sum + Math.abs(s.result_pips ?? 0), 0);
  const lossPips = signals
    .filter((s) => s.status === "SL")
    .reduce((sum, s) => sum + Math.abs(s.result_pips ?? 0), 0);
  const activeCount = signals.filter((s) => s.status === "OPEN" || s.status === "HIT_ENTRY").length;

  return {
    totalGrowthPercent,
    monthGrowthPercent,
    winRate,
    wins,
    losses,
    maxDrawdownPercent,
    activeCount,
    totalPips,
    profitPips,
    lossPips,
  };
}
