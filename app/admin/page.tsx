import Link from "next/link";
import { Users, Crown, UserPlus, TrendingUp, Wallet, Hourglass } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { UserGrowthChart } from "@/components/admin/UserGrowthChart";
import { SignupsChart, RevenueChart } from "@/components/admin/DashboardCharts";
import { RecentActivityFeed, type ActivityItem } from "@/components/admin/RecentActivityFeed";
import { formatPlainCurrency } from "@/lib/utils";
import { loadAdminDashboard, PLAN_LABEL } from "@/lib/admin-dashboard";

export const dynamic = "force-dynamic";

const idr = (n: number) => formatPlainCurrency(n, "IDR");

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  // Halaman ini sudah dijaga layout admin. Pembayaran dibaca lewat service role supaya semua baris
  // (IDR maupun USDT) terhitung apa pun aturan RLS tabel payments.
  const d = await loadAdminDashboard(supabase, createServiceClient());
  const {
    total,
    paidNow,
    membershipNow,
    vipNow,
    freeNow,
    last7,
    signupDelta,
    conversion,
    revenueMonthIdr,
    revenueAllIdr,
    revenueAllUsdt,
    pendingUsdt,
    signupData,
    revenueData,
    planRows,
    growthData,
  } = d;
  const items: ActivityItem[] = d.activity;
  const expiringSoon = d.expiringSoon;
  const recentlyExpired = d.recentlyExpired;

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">Admin Dashboard</h1>
        <p className="text-body-sm text-text-secondary">Signups, conversion, revenue and members about to expire.</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total Users" value={String(total)} icon={Users} />
        <KpiCard label="Paid Members Now" value={String(paidNow)} icon={Crown} valueClassName="text-primary" />
        <KpiCard label="Signups (7 days)" value={`${last7} (${signupDelta})`} icon={UserPlus} />
        <KpiCard label="Ever Paid / Signups" value={`${conversion.toFixed(1)}%`} icon={TrendingUp} />
        <KpiCard label="Revenue This Month" value={idr(revenueMonthIdr)} icon={Wallet} valueClassName="text-success" />
        <KpiCard label="Revenue All Time (IDR)" value={idr(revenueAllIdr)} icon={Wallet} valueClassName="text-success" />
        <KpiCard label="Revenue All Time (USDT)" value={`${revenueAllUsdt.toLocaleString("en-US", { maximumFractionDigits: 2 })} USDT`} icon={Wallet} valueClassName="text-success" />
        <KpiCard label="USDT Awaiting Review" value={String(pendingUsdt)} icon={Hourglass} valueClassName={pendingUsdt > 0 ? "text-warning" : undefined} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SignupsChart data={signupData} />
        <RevenueChart data={revenueData} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-1 text-body font-semibold text-text-primary">Membership Breakdown</h3>
          <p className="mb-4 text-caption text-text-muted">
            Free {freeNow} · VIP {vipNow} · Membership {membershipNow}
          </p>
          <table className="w-full text-body-sm">
            <thead className="text-left text-caption text-text-muted">
              <tr>
                <th className="pb-2 font-medium">Plan</th>
                <th className="pb-2 text-right font-medium">Paid orders</th>
                <th className="pb-2 text-right font-medium">IDR</th>
                <th className="pb-2 text-right font-medium">USDT</th>
              </tr>
            </thead>
            <tbody>
              {planRows.map((r) => (
                <tr key={r.plan} className="border-t border-border">
                  <td className="py-2 text-text-primary">{PLAN_LABEL[r.plan]}</td>
                  <td className="py-2 text-right tabular-nums">{r.count}</td>
                  <td className="py-2 text-right tabular-nums">{idr(r.idr)}</td>
                  <td className="py-2 text-right tabular-nums">{r.usdt ? r.usdt.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-caption text-text-muted">
            Includes sandbox test payments if any were made. Memberships granted manually by admin are not counted as orders.
          </p>
        </div>
        <UserGrowthChart data={growthData} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MemberList
          title={`Expiring within 14 days (${expiringSoon.length})`}
          empty="No memberships expiring soon."
          rows={expiringSoon.map((x) => ({
            ...x,
            note: x.daysLeft === 0 ? "ends today" : `${x.daysLeft}d left (${fmtDate(x.expiresAt!)})`,
          }))}
        />
        <MemberList
          title={`Expired in the last 14 days (${recentlyExpired.length})`}
          empty="Nobody expired recently."
          rows={recentlyExpired.map((x) => ({
            ...x,
            note: `ended ${fmtDate(x.expiresAt!)}`,
          }))}
        />
      </div>

      <RecentActivityFeed items={items} />
    </main>
  );
}

function MemberList({
  title,
  empty,
  rows,
}: {
  title: string;
  empty: string;
  rows: { id: string; name: string; email: string | null; tier: string; note: string }[];
}) {
  const shown = rows.slice(0, 10);
  return (
    <div className="card">
      <h3 className="mb-4 text-body font-semibold text-text-primary">{title}</h3>
      {shown.length === 0 ? (
        <p className="text-body-sm text-text-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-body-sm font-medium text-text-primary">{r.name}</p>
                <p className="truncate text-caption text-text-muted">{r.email}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-caption font-semibold text-primary">{r.tier}</p>
                <p className="text-caption text-text-muted">{r.note}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {rows.length > shown.length && (
        <Link href="/admin/users" className="mt-4 inline-block text-caption text-primary hover:underline">
          +{rows.length - shown.length} more, see Users
        </Link>
      )}
    </div>
  );
}
