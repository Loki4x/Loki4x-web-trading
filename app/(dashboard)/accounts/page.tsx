import { createClient } from "@/lib/supabase/server";
import { AccountsClient } from "@/components/accounts/AccountsClient";
import type { TradingAccount } from "@/lib/types";

export default async function AccountsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: accounts } = await supabase
    .from("trading_accounts")
    .select("*")
    .eq("user_id", user?.id ?? "")
    .order("created_at", { ascending: true });

  const { data: trades } = await supabase
    .from("trades")
    .select("account_id, pnl, status")
    .eq("user_id", user?.id ?? "");

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">Akun Journaling</h1>
        <p className="text-body-sm text-text-secondary">Kelola akun trading kamu (maksimal 5 akun).</p>
      </div>

      <AccountsClient
        accounts={(accounts ?? []) as TradingAccount[]}
        trades={trades ?? []}
      />
    </main>
  );
}
