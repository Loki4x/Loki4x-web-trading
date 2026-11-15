// Aturan risiko, target bulanan, dan streak disiplin untuk satu akun journaling.
// Fungsi murni (tanpa akses database), aman dipakai di server maupun klien.

import type { Trade, TradingAccount } from "@/lib/types";

export type RuleKey = "daily_loss" | "trades_per_day" | "consecutive_losses";
export type RuleLevel = "ok" | "warn" | "breached";

export interface RuleStatus {
  key: RuleKey;
  limit: number;
  current: number;
  level: RuleLevel;
}

export interface GoalProgress {
  target: number;
  current: number;
  /** 0–100 (dibatasi), untuk progress bar */
  percent: number;
  reached: boolean;
}

export interface DisciplineSummary {
  today: string;
  todayPnl: number;
  todayTrades: number;
  rules: RuleStatus[];
  /** Level terburuk dari semua aturan hari ini */
  overall: RuleLevel;
  month: string;
  monthPnl: number;
  monthWinRate: number;
  monthClosedTrades: number;
  profitGoal: GoalProgress | null;
  winRateGoal: GoalProgress | null;
  /** Hari trading berturut-turut (terbaru ke belakang) yang sesuai rencana & aturan */
  streak: number;
  bestStreak: number;
  hasRules: boolean;
  hasGoals: boolean;
}

/** Tanggal hari ini (YYYY-MM-DD) dalam WIB. */
export function todayWib(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

const positive = (v: number | null | undefined): number | null =>
  typeof v === "number" && Number.isFinite(v) && v > 0 ? Number(v) : null;

const isClosed = (t: DisciplineTrade) => t.status === "CLOSED" && t.pnl !== null;

function sortTrades<T extends DisciplineTrade>(trades: T[]): T[] {
  return [...trades].sort(
    (a, b) => a.trade_date.localeCompare(b.trade_date) || (a.created_at ?? "").localeCompare(b.created_at ?? "")
  );
}

interface DayStats {
  pnl: number;
  trades: number;
  startBalance: number;
  lossPct: number;
  /** loss beruntun di akhir hari (dipakai untuk status hari ini) */
  trailingLosses: number;
  /** ada trade yang diambil setelah batas loss beruntun tercapai */
  tradedAfterLossLimit: boolean;
  brokePlan: boolean;
}

function dayStats(dayTrades: DisciplineTrade[], startBalance: number, maxConsecutive: number | null): DayStats {
  let pnl = 0;
  let run = 0;
  let tradedAfterLossLimit = false;
  for (const t of dayTrades) {
    if (maxConsecutive !== null && run >= maxConsecutive) tradedAfterLossLimit = true;
    if (!isClosed(t)) continue;
    const p = Number(t.pnl);
    pnl += p;
    run = p < 0 ? run + 1 : 0;
  }
  const lossPct = startBalance > 0 ? (Math.max(0, -pnl) / startBalance) * 100 : 0;
  return {
    pnl,
    trades: dayTrades.length,
    startBalance,
    lossPct,
    trailingLosses: run,
    tradedAfterLossLimit,
    brokePlan: dayTrades.some((t) => t.followed_plan === false),
  };
}

function levelFor(current: number, limit: number, warnAt: number): RuleLevel {
  if (current >= limit) return "breached";
  if (current > 0 && current >= warnAt) return "warn";
  return "ok";
}

function goal(current: number, target: number | null): GoalProgress | null {
  if (target === null) return null;
  return {
    target,
    current,
    percent: Math.max(0, Math.min(100, (current / target) * 100)),
    reached: current >= target,
  };
}

/** Kolom trade yang dibutuhkan untuk menghitung disiplin (cukup untuk query ringan di laporan email). */
export type DisciplineTrade = Pick<Trade, "trade_date" | "pnl" | "status" | "followed_plan" | "created_at">;
type DisciplineAccount = Pick<
  TradingAccount,
  "initial_balance" | "max_daily_loss_pct" | "max_trades_per_day" | "max_consecutive_losses" | "monthly_profit_target" | "target_win_rate"
>;

export interface DayReport {
  day: string;
  trades: number;
  pnl: number;
  lossPct: number;
  /** melewati batas jumlah trade */
  overTrades: boolean;
  /** rugi melewati batas rugi harian */
  overLoss: boolean;
  /** tetap trade setelah batas loss beruntun tercapai */
  tradedAfterLossLimit: boolean;
  /** jumlah trade yang ditandai "tidak sesuai rencana" */
  offPlanTrades: number;
  disciplined: boolean;
}

interface Analysis {
  days: DayReport[];
  sorted: DisciplineTrade[];
  endBalance: number;
  maxConsecutive: number | null;
}

function analyze(account: DisciplineAccount, trades: DisciplineTrade[]): Analysis {
  const maxLoss = positive(account.max_daily_loss_pct);
  const maxTrades = positive(account.max_trades_per_day);
  const maxConsecutive = positive(account.max_consecutive_losses);

  const sorted = sortTrades(trades);
  const byDay = new Map<string, DisciplineTrade[]>();
  for (const t of sorted) {
    const list = byDay.get(t.trade_date) ?? [];
    list.push(t);
    byDay.set(t.trade_date, list);
  }

  // Saldo awal hari = saldo awal akun + P&L semua hari sebelumnya.
  const days: DayReport[] = [];
  let balance = Number(account.initial_balance) || 0;
  for (const day of Array.from(byDay.keys()).sort()) {
    const list = byDay.get(day)!;
    const s = dayStats(list, balance, maxConsecutive);
    const overTrades = maxTrades !== null && s.trades > maxTrades;
    const overLoss = maxLoss !== null && s.lossPct > maxLoss;
    days.push({
      day,
      trades: s.trades,
      pnl: s.pnl,
      lossPct: s.lossPct,
      overTrades,
      overLoss,
      tradedAfterLossLimit: s.tradedAfterLossLimit,
      offPlanTrades: list.filter((t) => t.followed_plan === false).length,
      // Hari disiplin: tidak ada trade "tidak sesuai rencana" dan tidak ada aturan yang dilanggar (melewati batas).
      disciplined: !s.brokePlan && !overTrades && !overLoss && !s.tradedAfterLossLimit,
    });
    balance += s.pnl;
  }
  return { days, sorted, endBalance: balance, maxConsecutive };
}

/** Laporan disiplin per hari trading (urut tanggal), dipakai di laporan email. */
export function dailyDiscipline(account: DisciplineAccount, trades: DisciplineTrade[]): DayReport[] {
  return analyze(account, trades).days;
}

export function computeDiscipline(
  account: DisciplineAccount,
  trades: DisciplineTrade[],
  today: string = todayWib()
): DisciplineSummary {
  const maxLoss = positive(account.max_daily_loss_pct);
  const maxTrades = positive(account.max_trades_per_day);
  const profitTarget = positive(account.monthly_profit_target);
  const winRateTarget = positive(account.target_win_rate);

  const { days, sorted, maxConsecutive } = analyze(account, trades);
  // Hari-hari setelah `today` diabaikan (mis. laporan bulan lalu dihitung per akhir bulan itu).
  const pastDays = days.filter((d) => d.day <= today);
  const startToday = (Number(account.initial_balance) || 0) + pastDays.filter((d) => d.day < today).reduce((s, d) => s + d.pnl, 0);
  const todayStats = dayStats(
    sorted.filter((t) => t.trade_date === today),
    startToday,
    maxConsecutive
  );

  const rules: RuleStatus[] = [];
  if (maxLoss !== null) {
    rules.push({
      key: "daily_loss",
      limit: maxLoss,
      current: todayStats.lossPct,
      level: levelFor(todayStats.lossPct, maxLoss, maxLoss * 0.8),
    });
  }
  if (maxTrades !== null) {
    rules.push({
      key: "trades_per_day",
      limit: maxTrades,
      current: todayStats.trades,
      level: levelFor(todayStats.trades, maxTrades, Math.max(1, maxTrades - 1)),
    });
  }
  if (maxConsecutive !== null) {
    rules.push({
      key: "consecutive_losses",
      limit: maxConsecutive,
      current: todayStats.trailingLosses,
      level: levelFor(todayStats.trailingLosses, maxConsecutive, Math.max(1, maxConsecutive - 1)),
    });
  }
  const overall: RuleLevel = rules.some((r) => r.level === "breached")
    ? "breached"
    : rules.some((r) => r.level === "warn")
      ? "warn"
      : "ok";

  let streak = 0;
  for (let i = pastDays.length - 1; i >= 0; i--) {
    if (!pastDays[i].disciplined) break;
    streak++;
  }
  let bestStreak = 0;
  let run = 0;
  for (const d of pastDays) {
    run = d.disciplined ? run + 1 : 0;
    bestStreak = Math.max(bestStreak, run);
  }

  const month = today.slice(0, 7);
  const monthClosed = sorted.filter((t) => isClosed(t) && t.trade_date.startsWith(month));
  const monthPnl = monthClosed.reduce((sum, t) => sum + Number(t.pnl), 0);
  const monthWins = monthClosed.filter((t) => Number(t.pnl) > 0).length;
  const monthWinRate = monthClosed.length > 0 ? (monthWins / monthClosed.length) * 100 : 0;

  return {
    today,
    todayPnl: todayStats.pnl,
    todayTrades: todayStats.trades,
    rules,
    overall,
    month,
    monthPnl,
    monthWinRate,
    monthClosedTrades: monthClosed.length,
    profitGoal: goal(monthPnl, profitTarget),
    winRateGoal: goal(monthWinRate, winRateTarget),
    streak,
    bestStreak,
    hasRules: rules.length > 0,
    hasGoals: profitTarget !== null || winRateTarget !== null,
  };
}
