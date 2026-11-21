import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveActiveAccount } from "@/lib/accounts";
import { getCotHighlights } from "@/lib/cot-highlights";
import { getRetailSentiment, mergeRetailSentiment } from "@/lib/myfxbook";
import { computeDiscipline } from "@/lib/discipline";
import { hasAccess, type Tier } from "@/lib/tier";
import type { Trade } from "@/lib/types";

/**
 * Data Beranda aplikasi (GET /api/mobile/dashboard), dihitung sama dengan halaman /dashboard web:
 * ringkasan trading akun aktif + kurva saldo + top pairs + disiplin (Membership), sorotan pasar
 * COT & Retail Bias (VIP+), langkah awal, dan riwayat pengajuan / pembayaran upgrade.
 */
export async function loadDashboardExtras(supabase: SupabaseClient, userId: string, tier: Tier) {
  const [{ count: tradeCount }, { data: vipRequests }, { data: payments }] = await Promise.all([
    supabase.from("trades").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("vip_ib_requests").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
    supabase.from("payments").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
  ]);

  const onboarding = [
    { key: "trade", label: "Catat trade pertama kamu", description: "Mulai isi Trade Journal", done: (tradeCount ?? 0) > 0 },
    { key: "upgrade", label: "Upgrade buat buka semua fitur", description: "Unlock Signals, Journal, Academy, dan lainnya", done: tier !== "FREE" },
  ];

  type HistoryItem = {
    id: string;
    kind: "VIP_IB" | "PAYMENT";
    title: string;
    status: string;
    created_at: string;
    amount: number | null;
    currency: string | null;
    reason: string | null;
  };
  const history: HistoryItem[] = [
    ...(vipRequests ?? []).map((r) => ({
      id: String(r.id),
      kind: "VIP_IB" as const,
      title: "VIP via IB",
      status: String(r.status),
      created_at: String(r.created_at),
      amount: null,
      currency: null,
      reason: (r as { rejection_reason?: string | null }).rejection_reason ?? null,
    })),
    ...(payments ?? []).map((p) => ({
      id: String(p.id),
      kind: "PAYMENT" as const,
      title: String(p.plan),
      status: String(p.status),
      created_at: String(p.created_at),
      amount: p.amount === null || p.amount === undefined ? null : Number(p.amount),
      currency: (p.currency as string | null) ?? null,
      reason: (p as { rejection_reason?: string | null }).rejection_reason ?? null,
    })),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20);

  let trading = null;
  if (tier === "MEMBERSHIP") {
    const { activeAccount } = await resolveActiveAccount(supabase, userId);
    const { data: raw } = await supabase
      .from("trades")
      .select("*")
      .eq("user_id", userId)
      .eq("account_id", activeAccount.id)
      .order("trade_date", { ascending: true });
    const trades = (raw ?? []) as Trade[];
    const closed = trades.filter((t) => t.status === "CLOSED");
    const totalPnl = closed.reduce((s, t) => s + (t.pnl ?? 0), 0);
    const wins = closed.filter((t) => (t.pnl ?? 0) > 0).length;

    let running = Number(activeAccount.initial_balance);
    const equity = closed.map((t) => {
      running += t.pnl ?? 0;
      return { date: t.trade_date, balance: running };
    });
    if (equity.length === 0) equity.push({ date: new Date().toISOString().slice(0, 10), balance: Number(activeAccount.initial_balance) });

    const byPair = new Map<string, number>();
    for (const t of closed) byPair.set(t.symbol, (byPair.get(t.symbol) ?? 0) + (t.pnl ?? 0));
    const topPairs = Array.from(byPair.entries())
      .map(([symbol, pnl]) => ({ symbol, pnl }))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 3);

    const today = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
    trading = {
      accountId: activeAccount.id,
      accountName: activeAccount.name,
      currency: activeAccount.currency,
      balance: Number(activeAccount.initial_balance) + totalPnl,
      totalPnl,
      todayPnl: closed.filter((t) => t.trade_date === today).reduce((s, t) => s + (t.pnl ?? 0), 0),
      winRate: closed.length ? (wins / closed.length) * 100 : 0,
      closedTrades: closed.length,
      equity,
      topPairs,
      discipline: computeDiscipline(activeAccount, trades),
    };
  }

  let market = null;
  if (hasAccess(tier, "VIP")) {
    const [cot, { data: positioningRows }, sentiment] = await Promise.all([
      getCotHighlights().catch(() => ({ positive: [], negative: [], reportDate: null })),
      supabase.from("positioning").select("symbol, long_percent, short_percent"),
      getRetailSentiment().catch(() => []),
    ]);
    const rows = mergeRetailSentiment(sentiment, positioningRows ?? []).map((m) => ({ symbol: m.symbol, long: m.longPercent, short: m.shortPercent }));
    market = {
      cot,
      longTop: [...rows].sort((a, b) => b.long - a.long).slice(0, 3).map((r) => ({ symbol: r.symbol, percent: r.long })),
      shortTop: [...rows].sort((a, b) => b.short - a.short).slice(0, 3).map((r) => ({ symbol: r.symbol, percent: r.short })),
    };
  }

  return { onboarding, history, trading, market };
}
