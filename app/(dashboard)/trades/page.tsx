import { createClient } from "@/lib/supabase/server";
import { resolveActiveAccount } from "@/lib/accounts";
import { TradesClient } from "@/components/trades/TradesClient";
import type { Trade } from "@/lib/types";

export default async function TradesPage({
  searchParams,
}: {
  searchParams: { add?: string; account?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { accounts, activeAccount } = await resolveActiveAccount(supabase, user?.id ?? "", searchParams.account);

  const { data: trades } = await supabase
    .from("trades")
    .select("*")
    .eq("user_id", user?.id ?? "")
    .eq("account_id", activeAccount.id)
    .order("trade_date", { ascending: false });

  const { data: allTradesSummary } = await supabase
    .from("trades")
    .select("account_id, pnl, status")
    .eq("user_id", user?.id ?? "");

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <TradesClient
        trades={(trades ?? []) as Trade[]}
        openModal={searchParams.add === "1"}
        accountId={activeAccount.id}
        accounts={accounts}
        allTradesSummary={allTradesSummary ?? []}
      />
    </main>
  );
}
