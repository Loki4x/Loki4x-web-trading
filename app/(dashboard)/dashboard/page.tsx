import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/dashboard/Topbar";
import { MembershipStatusBar } from "@/components/dashboard/MembershipStatusBar";
import { UpgradeBanner } from "@/components/dashboard/UpgradeBanner";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { UpgradeOffers } from "@/components/dashboard/UpgradeOffers";
import { UpgradeHistory } from "@/components/dashboard/UpgradeHistory";
import type { VipIbRequest } from "@/lib/types";
import type { Tier } from "@/lib/tier";

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

  return (
    <div>
      <Topbar userName={userName} />

      <main className="mx-auto max-w-content px-6 py-8">
        <MembershipStatusBar tier={tier} expiresAt={vipExpiresAt} />

        <UpgradeBanner tier={tier} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <OnboardingChecklist steps={onboardingSteps} />
          </div>
          <div>
            <UpgradeOffers tier={tier} />
          </div>
        </div>

        <div className="mt-6">
          <UpgradeHistory requests={(vipRequests ?? []) as VipIbRequest[]} />
        </div>
      </main>
    </div>
  );
}
