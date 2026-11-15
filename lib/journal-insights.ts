// Ringkas trade jurnal jadi statistik per kelompok (sesi, strategi, emosi, dll.) untuk review AI.
// Fungsi murni: tidak ada akses database atau API.

import type { Trade } from "@/lib/types";

export interface GroupStat {
  key: string;
  count: number;
  wins: number;
  winRate: number;
  pnl: number;
}

export interface JournalInsights {
  period: { from: string; to: string };
  overall: {
    closedTrades: number;
    wins: number;
    losses: number;
    winRate: number;
    netPnl: number;
    avgWin: number;
    avgLoss: number;
    profitFactor: number | null;
    largestWin: number;
    largestLoss: number;
    maxLosingStreak: number;
  };
  bySession: GroupStat[];
  byStrategy: GroupStat[];
  byEmotion: GroupStat[];
  byFollowedPlan: GroupStat[];
  bySymbol: GroupStat[];
  byWeekday: GroupStat[];
  bySide: GroupStat[];
  /** Trade terbaru yang punya catatan, untuk konteks kualitatif */
  recentNotes: {
    date: string;
    symbol: string;
    side: string;
    pnl: number;
    strategy: string | null;
    emotion: string | null;
    followedPlan: boolean | null;
    note: string;
  }[];
}

const WEEKDAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const round2 = (n: number) => Math.round(n * 100) / 100;

function group(trades: Trade[], keyOf: (t: Trade) => string | null, limit = 12): GroupStat[] {
  const map = new Map<string, GroupStat>();
  for (const t of trades) {
    const key = keyOf(t);
    if (key === null) continue;
    const g = map.get(key) ?? { key, count: 0, wins: 0, winRate: 0, pnl: 0 };
    g.count++;
    if (Number(t.pnl) > 0) g.wins++;
    g.pnl += Number(t.pnl);
    map.set(key, g);
  }
  return Array.from(map.values())
    .map((g) => ({ ...g, pnl: round2(g.pnl), winRate: Math.round((g.wins / g.count) * 100) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * @param trades semua trade satu akun
 * @param maxTrades batas jumlah trade tertutup terbaru yang dianalisis
 */
export function buildJournalInsights(trades: Trade[], maxTrades = 300): JournalInsights {
  const closed = trades
    .filter((t) => t.status === "CLOSED" && t.pnl !== null && Number.isFinite(Number(t.pnl)))
    .sort((a, b) => a.trade_date.localeCompare(b.trade_date) || (a.created_at ?? "").localeCompare(b.created_at ?? ""))
    .slice(-maxTrades);

  const pnls = closed.map((t) => Number(t.pnl));
  const wins = pnls.filter((p) => p > 0);
  const losses = pnls.filter((p) => p < 0);
  const grossWin = wins.reduce((a, b) => a + b, 0);
  const grossLoss = Math.abs(losses.reduce((a, b) => a + b, 0));
  let streak = 0;
  let maxLosingStreak = 0;
  for (const p of pnls) {
    streak = p < 0 ? streak + 1 : 0;
    maxLosingStreak = Math.max(maxLosingStreak, streak);
  }

  // Catatan otomatis dari import MT4/MT5 bukan tulisan user, jadi tidak dipakai sebagai konteks.
  const userNote = (t: Trade) =>
    [t.confluence, /^Import (MT4|MT5|CSV)\b/.test(t.notes ?? "") ? null : t.notes]
      .map((s) => (s ?? "").trim())
      .filter(Boolean)
      .join(" | ")
      .replace(/\s+/g, " ")
      .slice(0, 240);
  const withNotes = closed.filter((t) => userNote(t)).slice(-25);

  return {
    period: { from: closed[0]?.trade_date ?? "", to: closed[closed.length - 1]?.trade_date ?? "" },
    overall: {
      closedTrades: closed.length,
      wins: wins.length,
      losses: losses.length,
      winRate: closed.length ? Math.round((wins.length / closed.length) * 100) : 0,
      netPnl: round2(pnls.reduce((a, b) => a + b, 0)),
      avgWin: wins.length ? round2(grossWin / wins.length) : 0,
      avgLoss: losses.length ? round2(-grossLoss / losses.length) : 0,
      profitFactor: grossLoss > 0 ? round2(grossWin / grossLoss) : null,
      largestWin: wins.length ? round2(Math.max(...wins)) : 0,
      largestLoss: losses.length ? round2(Math.min(...losses)) : 0,
      maxLosingStreak,
    },
    bySession: group(closed, (t) => t.session ?? "Tidak diisi"),
    byStrategy: group(closed, (t) => t.strategy ?? "Tidak diisi"),
    byEmotion: group(closed, (t) => t.emotion ?? "Tidak diisi"),
    byFollowedPlan: group(closed, (t) =>
      t.followed_plan === true ? "Sesuai rencana" : t.followed_plan === false ? "Tidak sesuai rencana" : "Tidak diisi"
    ),
    bySymbol: group(closed, (t) => t.symbol, 10),
    byWeekday: group(closed, (t) => WEEKDAYS[new Date(`${t.trade_date}T00:00:00Z`).getUTCDay()]),
    bySide: group(closed, (t) => t.side),
    recentNotes: withNotes.map((t) => ({
      date: t.trade_date,
      symbol: t.symbol,
      side: t.side,
      pnl: round2(Number(t.pnl)),
      strategy: t.strategy,
      emotion: t.emotion,
      followedPlan: t.followed_plan,
      note: userNote(t),
    })),
  };
}
