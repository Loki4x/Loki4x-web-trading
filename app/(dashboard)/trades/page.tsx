import { createClient } from "@/lib/supabase/server";
import { resolveActiveAccount } from "@/lib/accounts";
import { TradesClient } from "@/components/trades/TradesClient";
import type { Trade } from "@/lib/types";
import { getCurrentUserTier, hasAccess } from "@/lib/tier";
import { AccessDenied } from "@/components/ui/AccessDenied";

export default async function TradesPage({
  searchParams,
}: {
  searchParams: { add?: string; account?: string };
}) {
  const tier = await getCurrentUserTier();
  if (!hasAccess(tier, "MEMBERSHIP")) {
    return <AccessDenied requiredTier="MEMBERSHIP" />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { accounts, activeAccount } = await resolveActiveAccount(supabase, user?.id ?? "", searchParams.account);

  const { data: tradesAsc } = await supabase
    .from("trades")
    .select("*")
    .eq("user_id", user?.id ?? "")
    .eq("account_id", activeAccount.id)
    .order("trade_date", { ascending: true });

  const { data: allTradesSummary } = await supabase
    .from("trades")
    .select("account_id, pnl, status")
    .eq("user_id", user?.id ?? "");

  const allTrades = (tradesAsc ?? []) as Trade[];
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
  const todayPnl = closedTrades.filter((t) => t.trade_date === today).reduce((sum, t) => sum + (t.pnl ?? 0), 0);

  const totalBalance = activeAccount.initial_balance + totalPnl;

  let running = activeAccount.initial_balance;
  const equityData = closedTrades.map((t) => {
    running += t.pnl ?? 0;
    return { date: t.trade_date, balance: running };
  });
  if (equityData.length === 0) {
    equityData.push({ date: today, balance: activeAccount.initial_balance });
  }

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <TradesClient
        trades={[...allTrades].reverse()}
        openModal={searchParams.add === "1"}
        accountId={activeAccount.id}
        accounts={accounts}
        allTradesSummary={allTradesSummary ?? []}
        stats={{ todayPnl, totalBalance, totalPnl, winRate, totalTrades: allTrades.length, profitFactor, bestDay }}
        equityData={equityData}
      />
    </main>
  );
}
