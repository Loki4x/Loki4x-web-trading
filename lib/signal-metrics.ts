import type { Signal, SignalStatus } from "@/lib/types";

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

export function livePercent(signal: Signal): number | null {
  if (signal.current_price === null) return null;
  const raw = ((signal.current_price - signal.entry_price) / signal.entry_price) * 100;
  return signal.side === "BUY" ? raw : -raw;
}

export interface GrowthPoint {
  date: string;
  growthPercent: number;
}

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
  activePnlPercent: number;
  activeCount: number;
  totalPips: number;
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

  const activeSignals = signals.filter((s) => s.status === "HIT_ENTRY");
  const activePnlPercent = activeSignals.reduce((sum, s) => {
    const r = rMultiple(s);
    if (r === null) return sum;
    return sum + r * (s.risk_percent ?? 2);
  }, 0);

  const totalPips = signals.reduce((sum, s) => sum + (s.result_pips ?? 0), 0);
  const activeCount = signals.filter((s) => s.status === "OPEN" || s.status === "HIT_ENTRY").length;

  return {
    totalGrowthPercent,
    monthGrowthPercent,
    winRate,
    wins,
    losses,
    maxDrawdownPercent,
    activePnlPercent,
    activeCount,
    totalPips,
  };
}
