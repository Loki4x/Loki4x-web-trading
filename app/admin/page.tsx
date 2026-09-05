import { Users, Crown, UserCheck, NotebookText, DollarSign } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { UserGrowthChart } from "@/components/admin/UserGrowthChart";
import { JournalTrendChart } from "@/components/admin/JournalTrendChart";
import { RecentActivityFeed, type ActivityItem } from "@/components/admin/RecentActivityFeed";
import { formatPlainCurrency } from "@/lib/utils";

// Placeholder price used to estimate revenue until the real Transactions
// module (Phase 3) is connected.
const VIP_MONTHLY_PRICE = 15;

function timeAgo(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [{ data: profiles }, { data: trades }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, tier, created_at").order("created_at", { ascending: false }),
    supabase.from("trades").select("id, user_id, symbol, created_at").order("created_at", { ascending: false }),
  ]);

  const allProfiles = profiles ?? [];
  const allTrades = trades ?? [];

  const totalUsers = allProfiles.length;
  const totalVip = allProfiles.filter((p) => p.tier === "VIP").length;
  const totalFree = totalUsers - totalVip;
  const totalJournalEntries = allTrades.length;
  const monthlyRevenue = totalVip * VIP_MONTHLY_PRICE;

  // User growth: last 6 months, cumulative signups split by current tier.
  const growthData = Array.from({ length: 6 }).map((_, i) => {
    const monthsAgo = 5 - i;
    const refDate = new Date();
    refDate.setMonth(refDate.getMonth() - monthsAgo);
    refDate.setDate(1);
    refDate.setHours(23, 59, 59, 999);
    const upToDate = allProfiles.filter((p) => new Date(p.created_at) <= refDate);
    return {
      month: refDate.toLocaleDateString("en-US", { month: "short" }),
      free: upToDate.filter((p) => p.tier !== "VIP").length,
      vip: upToDate.filter((p) => p.tier === "VIP").length,
    };
  });

  // Journal creation trend: last 14 days.
  const trendData = Array.from({ length: 14 }).map((_, i) => {
    const daysAgo = 13 - i;
    const day = new Date();
    day.setDate(day.getDate() - daysAgo);
    const dayKey = day.toISOString().slice(0, 10);
    const count = allTrades.filter((t) => t.created_at.slice(0, 10) === dayKey).length;
    return { day: day.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit" }), entries: count };
  });

  // Recent activity: merge recent signups + recent trades.
  const signupItems: ActivityItem[] = allProfiles.slice(0, 5).map((p) => ({
    id: `signup-${p.id}`,
    type: "signup",
    title: p.full_name || p.email || "New user",
    subtitle: "Joined Loki4x",
    timestamp: timeAgo(p.created_at),
  }));
  const tradeItems: ActivityItem[] = allTrades.slice(0, 5).map((t) => {
    const owner = allProfiles.find((p) => p.id === t.user_id);
    return {
      id: `trade-${t.id}`,
      type: "trade",
      title: owner?.full_name || owner?.email || "A user",
      subtitle: `Logged a ${t.symbol} trade`,
      timestamp: timeAgo(t.created_at),
    };
  });

  const activity = [...signupItems, ...tradeItems]
    .sort((a, b) => (a.timestamp > b.timestamp ? 1 : -1))
    .slice(0, 6);

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">Admin Dashboard</h1>
        <p className="text-body-sm text-text-secondary">Overview of your platform's growth and activity.</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard label="Total Users" value={String(totalUsers)} icon={Users} />
        <KpiCard label="VIP Members" value={String(totalVip)} icon={Crown} valueClassName="text-primary" />
        <KpiCard label="Free Members" value={String(totalFree)} icon={UserCheck} />
        <KpiCard label="Journal Entries" value={String(totalJournalEntries)} icon={NotebookText} />
        <KpiCard label="Monthly Revenue" value={formatPlainCurrency(monthlyRevenue)} icon={DollarSign} valueClassName="text-success" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <UserGrowthChart data={growthData} />
        <JournalTrendChart data={trendData} />
      </div>

      <RecentActivityFeed items={activity} />
    </main>
  );
}
