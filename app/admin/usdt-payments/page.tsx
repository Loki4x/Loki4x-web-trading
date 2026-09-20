import { createClient } from "@/lib/supabase/server";
import { UsdtPaymentsTable } from "@/components/admin/UsdtPaymentsTable";

export default async function AdminUsdtPaymentsPage() {
  const supabase = await createClient();

  const { data: payments } = await supabase
    .from("payments")
    .select("*, profiles(full_name, email)")
    .eq("currency", "USDT")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">Pembayaran USDT</h1>
        <p className="text-body-sm text-text-secondary">
          Verifikasi manual pembayaran via USDT — cek bukti transfer sebelum approve.
        </p>
      </div>

      <UsdtPaymentsTable payments={payments ?? []} />
    </main>
  );
}
