import { Sidebar } from "@/components/dashboard/Sidebar";
import { createClient } from "@/lib/supabase/server";
import { resolveActiveAccount } from "@/lib/accounts";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  let accounts: Awaited<ReturnType<typeof resolveActiveAccount>>["accounts"] = [];
  let tradesSummary: { account_id: string | null; pnl: number | null; status: string }[] = [];

  if (user) {
    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
    isAdmin = !!profile?.is_admin;
    const resolved = await resolveActiveAccount(supabase, user.id);
    accounts = resolved.accounts;

    const { data: summary } = await supabase.from("trades").select("account_id, pnl, status").eq("user_id", user.id);
    tradesSummary = summary ?? [];
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar isAdmin={isAdmin} accounts={accounts} tradesSummary={tradesSummary} />
      <div className="pt-topbar lg:pl-sidebar">{children}</div>
    </div>
  );
}
