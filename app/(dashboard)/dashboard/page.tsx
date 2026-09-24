import { createClient } from "@/lib/supabase/server";
import { resolveActiveAccount } from "@/lib/accounts";
import { getEconomicCalendarRange } from "@/lib/economic-calendar";
import { Topbar } from "@/components/dashboard/Topbar";
import { MembershipStatusBar } from "@/components/dashboard/MembershipStatusBar";
import { UpgradeBanner } from "@/components/dashboard/UpgradeBanner";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { UpgradeOffers } from "@/components/dashboard/UpgradeOffers";
import { UpgradeHistory } from "@/components/dashboard/UpgradeHistory";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { EquityChart } from "@/components/dashboard/EquityChart";
import { TopPairsList } from "@/components/reports/TopPairsList";
import { NewsWidget } from "@/components/dashboard/NewsWidget";
import { formatCurrency, formatPlainCurrency } from "@/lib/utils";
import type { VipIbRequest, Trade, NewsEvent } from "@/lib/types";
import type { Tier } from "@/lib/tier";
import Link from "next/link";
import { ArrowRight, Wallet, TrendingUp, Percent, Hash } from "lucide-react";

export default async function DashboardOverviewPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { count: tradeCount }, { data: vipRequests }] = await Promise.all([
    supabase.from("profiles").select("full_name, tier, vip_expires_at").eq("id", user?.id ?? "").single(),
    supabase.from("trades").select("id", { count: "exact", head: true }).eq("user_id", user?.id ?? ""),
    supabase
      .from("vip_ib_requests")
      .select("*")
      .eq("user_id", user?.id ?? "")
      .order("created_at", { ascending: false }),
  ]);

  const userName = profile?.full_name?.split(" ")[0] ?? "Trader";
  const vipExpiresAt = profile?.vip_expires_at ?? null;
  const rawTier = (profile?.tier ?? "FREE") as Tier;
  // Treat an expired VIP/Membership as FREE for display, same rule as lib/tier.ts
  const isExpired = rawTier !== "FREE" && !!vipExpiresAt && new Date(vipExpiresAt) < new Date();
  const tier: Tier = isExpired ? "FREE" : rawTier;

  const onboardingSteps = [
    {
      label: "Catat trade pertama kamu",
      description: "Mulai isi Trade Journal",
      done: (tradeCount ?? 0) > 0,
      href: "/trades?add=1",
    },
    {
      label: "Upgrade buat buka semua fitur",
      description: "Unlock Signals, Journal, Academy, dan lainnya",
      done: tier !== "FREE",
      href: "/upgrade",
    },
  ];
  const onboardingDone = onboardingSteps.every((s) => s.done);

  // Ringkasan trading & berita ekonomi cuma buat tier Membership (yang punya akses Journal & News)
  let tradingSnapshot: {
    accountName: string;
    currency: "USD" | "IDR";
    totalBalance: number;
    totalPnl: number;
    winRate: number;
    totalTrades: number;
    equityData: { date: string; balance: number }[];
    topPairs: { symbol: string; pnl: number }[];
  } | null = null;
  let highImpactNews: NewsEvent[] = [];

  if (tier === "MEMBERSHIP" && user) {
    const { activeAccount } = await resolveActiveAccount(supabase, user.id);
    const { data: closedTradesRaw } = await supabase
      .from("trades")
      .select("*")
      .eq("user_id", user.id)
      .eq("account_id", activeAccount.id)
      .eq("status", "CLOSED")
      .order("trade_date", { ascending: true });

    const closedTrades = (closedTradesRaw ?? []) as Trade[];
    const wins = closedTrades.filter((t) => (t.pnl ?? 0) > 0);
    const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
    const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;

    let running = activeAccount.initial_balance;
    const equityData = closedTrades.map((t) => {
      running += t.pnl ?? 0;
      return { date: t.trade_date, balance: running };
    });
    if (equityData.length === 0) {
      equityData.push({ date: new Date().toISOString().slice(0, 10), balance: activeAccount.initial_balance });
    }

    const byPair = new Map<string, number>();
    for (const t of closedTrades) {
      byPair.set(t.symbol, (byPair.get(t.symbol) ?? 0) + (t.pnl ?? 0));
    }
    const topPairs = Array.from(byPair.entries())
      .map(([symbol, pnl]) => ({ symbol, pnl }))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 3);

    tradingSnapshot = {
      accountName: activeAccount.name,
      currency: activeAccount.currency,
      totalBalance: activeAccount.initial_balance + totalPnl,
      totalPnl,
      winRate,
      totalTrades: closedTrades.length,
      equityData,
      topPairs,
    };

    const calendarEvents = await getEconomicCalendarRange();
    const now = new Date();
    highImpactNews = calendarEvents
      .filter((e) => e.impact === "HIGH" && new Date(e.dateISO) > now)
      .slice(0, 4)
      .map((e) => ({
        id: e.id,
        event_title: e.title,
        currency: e.currency,
        impact_level: "HIGH" as const,
        release_time: e.dateISO,
        actual: e.actual || null,
        forecast: e.forecast || null,
        previous: e.previous || null,
      }));
  }

  return (
    <div>
      <Topbar userName={userName} />

      <main className="mx-auto max-w-content px-6 py-8">
        <MembershipStatusBar tier={tier} expiresAt={vipExpiresAt} />

        <UpgradeBanner tier={tier} />

        <div className="mb-6">
          <QuickActions tier={tier} />
        </div>

        {!onboardingDone && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <OnboardingChecklist steps={onboardingSteps} />
            </div>
            <div>
              <UpgradeOffers tier={tier} />
            </div>
          </div>
        )}

        {tradingSnapshot && (
          <div className="mb-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-h3 text-text-primary">Ringkasan Trading</h2>
                <p className="text-body-sm text-text-secondary">Akun aktif: {tradingSnapshot.accountName}</p>
              </div>
              <Link href="/trades" className="flex items-center gap-1 text-body-sm font-medium text-primary hover:underline">
                Lihat Journal lengkap
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <KpiCard
                label="Total Balance"
                value={formatPlainCurrency(tradingSnapshot.totalBalance, tradingSnapshot.currency)}
                icon={Wallet}
              />
              <KpiCard
                label="Total P&L"
                value={formatCurrency(tradingSnapshot.totalPnl, tradingSnapshot.currency)}
                icon={TrendingUp}
                valueClassName={tradingSnapshot.totalPnl >= 0 ? "text-success" : "text-error"}
              />
              <KpiCard label="Win Rate" value={`${tradingSnapshot.winRate.toFixed(1)}%`} icon={Percent} />
              <KpiCard label="Total Trades" value={String(tradingSnapshot.totalTrades)} icon={Hash} />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <EquityChart data={tradingSnapshot.equityData} currency={tradingSnapshot.currency} />
              </div>
              <TopPairsList pairs={tradingSnapshot.topPairs} currency={tradingSnapshot.currency} />
            </div>
          </div>
        )}

        {tier === "MEMBERSHIP" && (
          <div className="mb-6">
            <NewsWidget events={highImpactNews} />
          </div>
        )}

        <UpgradeHistory requests={(vipRequests ?? []) as VipIbRequest[]} />
      </main>
    </div>
  );
}
