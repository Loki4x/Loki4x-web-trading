import { createClient } from "@/lib/supabase/server";
import { SignalsList } from "@/components/signals/SignalsList";
import { getCurrentUserTier, hasAccess } from "@/lib/tier";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { getT } from "@/lib/i18n/server";
import type { SignalUpdate } from "@/lib/types";

export default async function SignalsPage() {
  const { t } = await getT();
  const tier = await getCurrentUserTier();
  if (!hasAccess(tier, "VIP")) {
    return <AccessDenied requiredTier="VIP" />;
  }

  const supabase = await createClient();
  const { data: signals } = await supabase
    .from("signals")
    .select(
      "id, symbol, side, entry_price, current_price, current_price_at, take_profit, stop_loss, status, result_pips, risk_percent, signal_type, notes, chart_image_url, posted_at, closed_at"
    )
    .order("posted_at", { ascending: false });

  // Timeline update per sinyal. Kalau tabel belum dibuat / error, tampil tanpa timeline (tidak crash).
  const { data: updateRows } = await supabase
    .from("signal_updates")
    .select("id, signal_id, type, message, price, created_at")
    .order("created_at", { ascending: true });
  const updatesBySignal: Record<string, SignalUpdate[]> = {};
  for (const u of (updateRows ?? []) as SignalUpdate[]) {
    (updatesBySignal[u.signal_id] ??= []).push(u);
  }

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">{t("signals.title")}</h1>
        <p className="text-body-sm text-text-secondary">{t("signals.subtitle")}</p>
      </div>

      <SignalsList signals={signals ?? []} updatesBySignal={updatesBySignal} />
    </main>
  );
}
