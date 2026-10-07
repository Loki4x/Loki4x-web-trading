import { createClient } from "@/lib/supabase/server";
import { SignalsAdminTable } from "@/components/admin/SignalsAdminTable";
import { getT } from "@/lib/i18n/server";

export default async function AdminSignalsPage() {
  const { t } = await getT();
  const supabase = await createClient();
  const { data: signals } = await supabase
    .from("signals")
    .select(
      "id, symbol, side, entry_price, current_price, current_price_at, take_profit, stop_loss, status, result_pips, risk_percent, signal_type, notes, chart_image_url, posted_at, closed_at"
    )
    .order("posted_at", { ascending: false });

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">Signals & Track Record</h1>
        <p className="text-body-sm text-text-secondary">{t("Kelola sinyal trading yang ditampilkan ke user.")}</p>
      </div>

      <SignalsAdminTable signals={signals ?? []} />
    </main>
  );
}
