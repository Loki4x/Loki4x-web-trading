import { createClient } from "@/lib/supabase/server";
import { RetailBiasClient } from "@/components/positioning/RetailBiasClient";
import { getCurrentUserTier, hasAccess } from "@/lib/tier";
import { AccessDenied } from "@/components/ui/AccessDenied";

export default async function PositioningPage() {
  const tier = await getCurrentUserTier();
  if (!hasAccess(tier, "VIP")) {
    return <AccessDenied requiredTier="VIP" />;
  }

  const supabase = await createClient();
  const { data: positioning } = await supabase
    .from("positioning")
    .select("id, symbol, long_percent, short_percent, updated_at")
    .order("symbol", { ascending: true });

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">Retail Bias</h1>
        <p className="text-body-sm text-text-secondary">Sentimen retail (long vs short) — dibaca kontrarian.</p>
      </div>

      <RetailBiasClient items={positioning ?? []} />
    </main>
  );
}
