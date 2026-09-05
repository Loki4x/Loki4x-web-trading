import { createClient } from "@/lib/supabase/server";
import { TradesClient } from "@/components/trades/TradesClient";
import type { Trade } from "@/lib/types";

export default async function TradesPage({
  searchParams,
}: {
  searchParams: { add?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: trades } = await supabase
    .from("trades")
    .select("*")
    .eq("user_id", user?.id ?? "")
    .order("trade_date", { ascending: false });

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <TradesClient trades={(trades ?? []) as Trade[]} openModal={searchParams.add === "1"} />
    </main>
  );
}
