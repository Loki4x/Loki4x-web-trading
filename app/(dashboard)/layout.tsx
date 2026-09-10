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
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
    isAdmin = !!profile?.is_admin;
    const resolved = await resolveActiveAccount(supabase, user.id);
    accounts = resolved.accounts;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar isAdmin={isAdmin} accounts={accounts} />
      <div className="pt-topbar lg:pl-sidebar">{children}</div>
    </div>
  );
}
