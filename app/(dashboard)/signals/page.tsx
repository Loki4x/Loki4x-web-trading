import { createClient } from "@/lib/supabase/server";
import { SignalsList } from "@/components/signals/SignalsList";

export default async function SignalsPage() {
  const supabase = await createClient();
  const { data: signals } = await supabase
    .from("signals")
    .select("id, symbol, side, entry_price, take_profit, stop_loss, status, result_pips, notes, posted_at")
    .order("posted_at", { ascending: false });

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">Signals & Track Record</h1>
        <p className="text-body-sm text-text-secondary">Sinyal trading dan rekam jejak performa.</p>
      </div>

      <SignalsList signals={signals ?? []} />
    </main>
  );
}
