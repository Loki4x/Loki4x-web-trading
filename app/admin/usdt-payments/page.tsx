import { createClient } from "@/lib/supabase/server";
import { UsdtPaymentsTable } from "@/components/admin/UsdtPaymentsTable";
import { getT } from "@/lib/i18n/server";

export default async function AdminUsdtPaymentsPage() {
  const { t } = await getT();
  const supabase = await createClient();

  // Ambil pembayaran dan profil secara terpisah. Join "profiles(...)" di satu query bisa gagal diam-diam
  // kalau relasi foreign key payments -> profiles tidak ada, dan hasilnya daftar tampak kosong.
  const { data: rows, error } = await supabase
    .from("payments")
    .select("*")
    .eq("currency", "USDT")
    .order("created_at", { ascending: false });
  if (error) console.error("[admin/usdt-payments] gagal ambil pembayaran:", error.message);

  const userIds = Array.from(new Set((rows ?? []).map((p) => p.user_id as string)));
  const { data: profileRows } =
    userIds.length > 0
      ? await supabase.from("profiles").select("id, full_name, email").in("id", userIds)
      : { data: [] as { id: string; full_name: string | null; email: string | null }[] };
  const profileById = new Map((profileRows ?? []).map((p) => [p.id, p]));

  const payments = (rows ?? []).map((p) => ({ ...p, profiles: profileById.get(p.user_id) ?? null }));

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">{t("Pembayaran USDT")}</h1>
        <p className="text-body-sm text-text-secondary">
          {t("Verifikasi manual pembayaran via USDT — cek bukti transfer sebelum approve.")}
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-error-subtle px-4 py-3 text-body-sm text-error">
          Gagal memuat pembayaran: {error.message}
        </p>
      )}

      <UsdtPaymentsTable payments={payments} />
    </main>
  );
}
