import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/dashboard/Topbar";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { EquityChart } from "@/components/dashboard/EquityChart";
import { NewsWidget } from "@/components/dashboard/NewsWidget";
import { formatCurrency, formatPlainCurrency } from "@/lib/utils";
import type { NewsEvent, Trade } from "@/lib/types";
import { Wallet, TrendingUp, Percent, Hash, Target, Trophy } from "lucide-react";

export default async function DashboardOverviewPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: trades }, { data: news }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user?.id ?? "").single(),
    supabase
      .from("trades")
      .select("*")
      .eq("user_id", user?.id ?? "")
      .order("trade_date", { ascending: true }),
    supabase
      .from("news")
      .select("*")
      .eq("impact_level", "HIGH")
      .gte("release_time", new Date().toISOString())
      .order("release_time", { ascending: true })
      .limit(5),
  ]);

  const allTrades = (trades ?? []) as Trade[];
  const closedTrades = allTrades.filter((t) => t.status === "CLOSED" && t.pnl !== null);
  const wins = closedTrades.filter((t) => (t.pnl ?? 0) > 0);
  const losses = closedTrades.filter((t) => (t.pnl ?? 0) < 0);

  const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const grossProfit = wins.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + (t.pnl ?? 0), 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? grossProfit : 0;
  const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;
  const bestDay = closedTrades.reduce((max, t) => Math.max(max, t.pnl ?? 0), 0);

  const today = new Date().toISOString().slice(0, 10);
  const todayPnl = closedTrades
    .filter((t) => t.trade_date === today)
    .reduce((sum, t) => sum + (t.pnl ?? 0), 0);

  const startingBalance = 10000;
  const totalBalance = startingBalance + totalPnl;

  let running = startingBalance;
  const equityData = closedTrades.map((t) => {
    running += t.pnl ?? 0;
    return { date: t.trade_date, balance: running };
  });
  if (equityData.length === 0) {
    equityData.push({ date: today, balance: startingBalance });
  }

  const userName = profile?.full_name?.split(" ")[0] ?? "Trader";

  return (
    <div>
      <Topbar userName={userName} />

      <main className="mx-auto max-w-content px-6 py-8">
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard
            label="Today's P&L"
            value={formatCurrency(todayPnl)}
            icon={Wallet}
            valueClassName={todayPnl >= 0 ? "text-success" : "text-error"}
            featured
          />
          <KpiCard label="Total Balance" value={formatPlainCurrency(totalBalance)} icon={TrendingUp} />
          <KpiCard
            label="Total P&L"
            value={formatCurrency(totalPnl)}
            icon={Target}
            valueClassName={totalPnl >= 0 ? "text-success" : "text-error"}
          />
          <KpiCard label="Win Rate" value={`${winRate.toFixed(1)}%`} icon={Percent} />
          <KpiCard label="Total Trades" value={String(allTrades.length)} icon={Hash} />
          <KpiCard label="Profit Factor" value={profitFactor.toFixed(2)} icon={TrendingUp} />
          <KpiCard
            label="Best Day"
            value={formatCurrency(bestDay)}
            icon={Trophy}
            valueClassName="text-success"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <EquityChart data={equityData} />
          </div>
          <div>
            <NewsWidget events={(news ?? []) as NewsEvent[]} />
          </div>
        </div>
      </main>
    </div>
  );
}
