import { createClient } from "@/lib/supabase/server";
import { PositioningBars } from "@/components/positioning/PositioningBars";

export default async function PositioningPage() {
  const supabase = await createClient();
  const { data: positioning } = await supabase
    .from("positioning")
    .select("id, symbol, long_percent, short_percent, updated_at")
    .order("symbol", { ascending: true });

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">Positioning</h1>
        <p className="text-body-sm text-text-secondary">Data positioning pasar (long vs short).</p>
      </div>

      <PositioningBars items={positioning ?? []} />
    </main>
  );
}
