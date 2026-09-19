import { createClient } from "@/lib/supabase/server";
import { VipRequestForm } from "@/components/upgrade/VipRequestForm";
import type { VipIbRequest } from "@/lib/types";

const IB_LINK = "https://one.exnessonelink.com/a/vkmgfauvyh";

export default async function UpgradePage({ searchParams }: { searchParams: { paid?: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", user?.id ?? "")
    .single();

  const { data: existingRequest } = await supabase
    .from("vip_ib_requests")
    .select("*")
    .eq("user_id", user?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">Upgrade ke VIP</h1>
        <p className="text-body-sm text-text-secondary">
          Tier kamu sekarang: <strong>{profile?.tier ?? "FREE"}</strong>
        </p>
      </div>

      {searchParams?.paid === "1" && (
        <div className="mb-6 rounded-lg border border-success/30 bg-success-subtle px-4 py-3 text-body-sm text-success">
          Pembayaran kamu sedang diverifikasi. Kalau status membership belum berubah dalam 1 menit, refresh halaman ini.
        </div>
      )}

      {profile?.tier && profile.tier !== "FREE" ? (
        <div className="card">
          <p className="text-body-sm text-text-secondary">
            Akun kamu sudah aktif di tier <strong>{profile.tier}</strong>. Nggak perlu ngajuin lagi.
          </p>
        </div>
      ) : (
        <VipRequestForm ibLink={IB_LINK} existingRequest={(existingRequest as VipIbRequest) ?? null} />
      )}
    </main>
  );
}
