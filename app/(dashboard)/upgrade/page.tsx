import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMembershipStatus } from "@/lib/tier";
import { purchasablePlans } from "@/lib/pakasir-constants";
import { VipRequestForm } from "@/components/upgrade/VipRequestForm";
import type { VipIbRequest } from "@/lib/types";

const IB_LINK = "https://one.exnessonelink.com/a/vkmgfauvyh";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
}

export default async function UpgradePage({ searchParams }: { searchParams: { paid?: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Status efektif: memperhitungkan masa aktif. Member yang sudah kedaluwarsa
  // dianggap FREE (sama seperti semua halaman berbayar), jadi bisa memperpanjang.
  const status = await getMembershipStatus();
  const plans = purchasablePlans(status);
  const isFree = status.tier === "FREE";

  const { data: existingRequest } = await supabase
    .from("vip_ib_requests")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">Upgrade &amp; Perpanjangan</h1>
        <p className="text-body-sm text-text-secondary">
          Tier kamu sekarang: <strong>{status.tier}</strong>
          {!isFree && status.permanent && " · aktif tanpa batas waktu"}
          {!isFree && !status.permanent && status.expiresAt && ` · aktif sampai ${formatDate(status.expiresAt)}`}
        </p>
      </div>

      {searchParams?.paid === "1" && (
        <div className="mb-6 rounded-lg border border-success/30 bg-success-subtle px-4 py-3 text-body-sm text-success">
          Pembayaran kamu sedang diverifikasi. Kalau status membership belum berubah dalam 1 menit, refresh halaman ini.
        </div>
      )}

      {status.expired && status.expiresAt && (
        <div className="mb-6 rounded-lg border border-warning/30 bg-warning-subtle px-4 py-3 text-body-sm text-warning">
          Masa aktif {status.storedTier} kamu berakhir pada {formatDate(status.expiresAt)}. Perpanjang untuk membuka
          kembali fitur berbayar.
        </div>
      )}

      {plans.length === 0 ? (
        <div className="card">
          <p className="text-body-sm text-text-secondary">
            Akun kamu aktif di tier <strong>{status.tier}</strong> tanpa batas waktu. Nggak perlu bayar lagi.
          </p>
        </div>
      ) : (
        <>
          {!isFree && !status.permanent && (
            <p className="mb-4 text-body-sm text-text-secondary">
              Perpanjangan bulanan ditambahkan dari tanggal berakhir saat ini, jadi sisa waktu kamu tidak hangus.
            </p>
          )}
          <VipRequestForm
            ibLink={IB_LINK}
            existingRequest={(existingRequest as VipIbRequest) ?? null}
            plans={plans}
            activeTier={status.tier}
            showIbPath={isFree}
          />
        </>
      )}
    </main>
  );
}
