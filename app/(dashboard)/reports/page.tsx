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
import { getT } from "@/lib/i18n/server";

function parseDateParts(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { year: y, month: m - 1, day: d }; // month: 0-indexed
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { account?: string; month?: string };
}) {
  const { t } = await getT();
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

  // Daily P&L Heatmap — bulan dipilih lewat ?month=YYYY-MM (default: bulan berjalan).
  // Navigasi dibatasi dari bulan trade paling awal sampai bulan berjalan.
  const now = new Date();
  const monthKey = (y: number, m0: number) => `${y}-${String(m0 + 1).padStart(2, "0")}`;
  const maxKey = monthKey(now.getFullYear(), now.getMonth());
  const minKey = closed.reduce((min, tr) => {
    const { year, month } = parseDateParts(tr.trade_date);
    const key = monthKey(year, month);
    return key < min ? key : min;
  }, maxKey);

  const requested = /^\d{4}-(0[1-9]|1[0-2])$/.test(searchParams.month ?? "") ? (searchParams.month as string) : maxKey;
  const selectedKey = requested > maxKey ? maxKey : requested < minKey ? minKey : requested;
  const [selYear, selMonth1] = selectedKey.split("-").map(Number);
  const selectedYear = selYear;
  const selectedMonth = selMonth1 - 1; // 0-indexed

  const shiftKey = (delta: number) => {
    const d = new Date(selectedYear, selectedMonth + delta, 1);
    return monthKey(d.getFullYear(), d.getMonth());
  };
  const monthHref = (key: string) => {
    const qs = new URLSearchParams();
    if (searchParams.account) qs.set("account", searchParams.account);
    if (key !== maxKey) qs.set("month", key); // bulan berjalan = URL bersih
    const q = qs.toString();
    return q ? `/reports?${q}` : "/reports";
  };
  const prevKey = shiftKey(-1);
  const nextKey = shiftKey(1);
  const prevHref = prevKey >= minKey ? monthHref(prevKey) : null;
  const nextHref = nextKey <= maxKey ? monthHref(nextKey) : null;

  const byDay = new Map<number, number>();
  for (const t of closed) {
    const { year, month, day } = parseDateParts(t.trade_date);
    if (year === selectedYear && month === selectedMonth) {
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
        <p className="text-body-sm text-text-secondary">{t("Pantau performa trading kamu dari berbagai sudut.")}</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Avg Win" value={formatCurrency(avgWin, activeAccount.currency)} valueClassName="text-success" />
        <KpiCard label="Avg Loss" value={formatCurrency(-avgLoss, activeAccount.currency)} valueClassName="text-error" />
        <KpiCard label="Expectancy / Trade" value={formatCurrency(expectancy, activeAccount.currency)} />
        <KpiCard label="Closed Trades" value={String(closed.length)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DailyPnlHeatmap
            year={selectedYear}
            month={selectedMonth}
            days={dailyPnl}
            currency={activeAccount.currency}
            prevHref={prevHref}
            nextHref={nextHref}
          />
        </div>
        <div className="flex flex-col gap-6">
          <TopPairsList pairs={pairs} currency={activeAccount.currency} />
          <SessionBreakdown stats={sessionStats} />
        </div>
      </div>
    </main>
  );
}
