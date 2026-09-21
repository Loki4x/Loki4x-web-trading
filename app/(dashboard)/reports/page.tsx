import { createClient } from "@/lib/supabase/server";
import { resolveActiveAccount } from "@/lib/accounts";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { TopPairsList } from "@/components/reports/TopPairsList";
import { DailyPnlHeatmap } from "@/components/reports/DailyPnlHeatmap";
import { SessionBreakdown, type SessionStat } from "@/components/reports/SessionBreakdown";
import { formatCurrency } from "@/lib/utils";
import type { Trade, TradeSession } from "@/lib/types";
import { getCurrentUserTier, hasAccess } from "@/lib/tier";
import { AccessDenied } from "@/components/ui/AccessDenied";

function parseDateParts(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { year: y, month: m - 1, day: d }; // month: 0-indexed
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { account?: string };
}) {
  const tier = await getCurrentUserTier();
  if (!hasAccess(tier, "MEMBERSHIP")) {
    return <AccessDenied requiredTier="MEMBERSHIP" />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { activeAccount } = await resolveActiveAccount(supabase, user?.id ?? "", searchParams.account);

  const { data: trades } = await supabase
    .from("trades")
    .select("*")
    .eq("user_id", user?.id ?? "")
    .eq("account_id", activeAccount.id)
    .eq("status", "CLOSED")
    .order("trade_date", { ascending: true });

  const closed = (trades ?? []) as Trade[];

  const wins = closed.filter((t) => (t.pnl ?? 0) > 0);
  const losses = closed.filter((t) => (t.pnl ?? 0) < 0);
  const avgWin = wins.length ? wins.reduce((s, t) => s + (t.pnl ?? 0), 0) / wins.length : 0;
  const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + (t.pnl ?? 0), 0) / losses.length) : 0;
  const expectancy =
    closed.length > 0 ? (wins.length / closed.length) * avgWin - (losses.length / closed.length) * avgLoss : 0;

  // Top Pairs — total P&L per symbol, dari yang paling untung ke paling rugi
  const byPair = new Map<string, number>();
  for (const t of closed) {
    byPair.set(t.symbol, (byPair.get(t.symbol) ?? 0) + (t.pnl ?? 0));
  }
  const pairs = Array.from(byPair.entries())
    .map(([symbol, pnl]) => ({ symbol, pnl }))
    .sort((a, b) => b.pnl - a.pnl);

  // Daily P&L Heatmap — bulan berjalan
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const byDay = new Map<number, number>();
  for (const t of closed) {
    const { year, month, day } = parseDateParts(t.trade_date);
    if (year === currentYear && month === currentMonth) {
      byDay.set(day, (byDay.get(day) ?? 0) + (t.pnl ?? 0));
    }
  }
  const dailyPnl = Array.from(byDay.entries()).map(([day, pnl]) => ({ day, pnl }));

  // By Session — win rate per sesi (cuma trade yang sudah diisi session-nya)
  const sessionGroups = new Map<TradeSession, { wins: number; total: number }>();
  for (const t of closed) {
    if (!t.session) continue;
    const g = sessionGroups.get(t.session) ?? { wins: 0, total: 0 };
    g.total += 1;
    if ((t.pnl ?? 0) > 0) g.wins += 1;
    sessionGroups.set(t.session, g);
  }
  const sessionStats: SessionStat[] = Array.from(sessionGroups.entries()).map(([session, g]) => ({
    session,
    winRate: g.total > 0 ? (g.wins / g.total) * 100 : 0,
    total: g.total,
  }));

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">Reports &amp; Performance</h1>
        <p className="text-body-sm text-text-secondary">Pantau performa trading kamu dari berbagai sudut.</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Avg Win" value={formatCurrency(avgWin)} valueClassName="text-success" />
        <KpiCard label="Avg Loss" value={formatCurrency(-avgLoss)} valueClassName="text-error" />
        <KpiCard label="Expectancy / Trade" value={formatCurrency(expectancy)} />
        <KpiCard label="Closed Trades" value={String(closed.length)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DailyPnlHeatmap year={currentYear} month={currentMonth} days={dailyPnl} />
        </div>
        <div className="flex flex-col gap-6">
          <TopPairsList pairs={pairs} />
          <SessionBreakdown stats={sessionStats} />
        </div>
      </div>
    </main>
  );
}
