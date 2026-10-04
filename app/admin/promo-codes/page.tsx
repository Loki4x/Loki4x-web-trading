import { createClient } from "@/lib/supabase/server";
import { PromoCodesAdmin, type PromoAdminRow } from "@/components/admin/PromoCodesAdmin";
import { getT } from "@/lib/i18n/server";

export default async function AdminPromoCodesPage() {
  const { t } = await getT();
  const supabase = await createClient();

  const { data } = await supabase
    .from("promo_codes")
    .select("id, code, type, value, max_uses, used_count, valid_from, valid_until, plans, active, note")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">{t("Kode Promo")}</h1>
        <p className="text-body-sm text-text-secondary">
          {t("Buat kode diskon untuk pembayaran paket. Harga akhir dihitung di server saat user membayar.")}
        </p>
      </div>

      <PromoCodesAdmin rows={(data ?? []) as PromoAdminRow[]} />
    </main>
  );
}
