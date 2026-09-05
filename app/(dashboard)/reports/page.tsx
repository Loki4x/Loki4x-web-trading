import { createClient } from "@/lib/supabase/server";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { BreakdownChart } from "@/components/dashboard/BreakdownChart";
import { formatCurrency } from "@/lib/utils";
import type { Trade } from "@/lib/types";

export default async function ReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: trades } = await supabase
    .from("trades")
    .select("*")
    .eq("user_id", user?.id ?? "")
    .eq("status", "CLOSED")
    .order("trade_date", { ascending: true });

  const closed = (trades ?? []) as Trade[];

  const byPair = new Map<string, number>();
  const byMonth = new Map<string, number>();

  for (const t of closed) {
    byPair.set(t.symbol, (byPair.get(t.symbol) ?? 0) + (t.pnl ?? 0));
    const month = new Date(t.trade_date).toLocaleDateString("en-US", { month: "short" });
    byMonth.set(month, (byMonth.get(month) ?? 0) + (t.pnl ?? 0));
  }

  const pairData = Array.from(byPair.entries()).map(([label, value]) => ({ label, value }));
  const monthData = Array.from(byMonth.entries()).map(([label, value]) => ({ label, value }));

  const wins = closed.filter((t) => (t.pnl ?? 0) > 0);
  const losses = closed.filter((t) => (t.pnl ?? 0) < 0);
  const avgWin = wins.length ? wins.reduce((s, t) => s + (t.pnl ?? 0), 0) / wins.length : 0;
  const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + (t.pnl ?? 0), 0) / losses.length) : 0;
  const expectancy =
    closed.length > 0
      ? (wins.length / closed.length) * avgWin - (losses.length / closed.length) * avgLoss
      : 0;

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">Reports &amp; Performance</h1>
        <p className="text-body-sm text-text-secondary">Break down your edge by pair and by month.</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Avg Win" value={formatCurrency(avgWin)} valueClassName="text-success" />
        <KpiCard label="Avg Loss" value={formatCurrency(-avgLoss)} valueClassName="text-error" />
        <KpiCard label="Expectancy / Trade" value={formatCurrency(expectancy)} />
        <KpiCard label="Closed Trades" value={String(closed.length)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BreakdownChart title="P&L by Pair" data={pairData} />
        <BreakdownChart title="P&L by Month" data={monthData} />
      </div>
    </main>
  );
}
