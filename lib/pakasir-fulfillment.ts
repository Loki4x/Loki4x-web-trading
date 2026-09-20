import { createServiceClient } from "@/lib/supabase/service";
import { getPakasirTransactionDetail } from "@/lib/pakasir";
import { notifyUser } from "@/lib/notifications";
import { planToTier, isLifetimePlan, type Plan } from "@/lib/pakasir-constants";

/**
 * Verifikasi status transaksi ke Pakasir (Transaction Detail API, bukan
 * cuma percaya body webhook), lalu kalau memang lunas: upgrade tier user
 * + kirim notifikasi. Idempotent — aman dipanggil berkali-kali untuk
 * order_id yang sama (dari webhook maupun dari tombol "Cek Status" user).
 */
export async function finalizePakasirPayment(orderId: string): Promise<{ status: "COMPLETED" | "PENDING" | "NOT_FOUND" }> {
  const service = createServiceClient();

  const { data: payment } = await service.from("payments").select("*").eq("order_id", orderId).single();
  if (!payment) return { status: "NOT_FOUND" };

  if (payment.status === "COMPLETED") return { status: "COMPLETED" };

  const transaction = await getPakasirTransactionDetail({ orderId, amount: payment.amount });
  if (!transaction || transaction.status !== "completed" || transaction.amount !== payment.amount) {
    return { status: "PENDING" };
  }

  await service
    .from("payments")
    .update({
      status: "COMPLETED",
      payment_method: transaction.payment_method,
      completed_at: transaction.completed_at ?? new Date().toISOString(),
    })
    .eq("order_id", orderId);

  const { data: profile } = await service
    .from("profiles")
    .select("tier, vip_expires_at, email")
    .eq("id", payment.user_id)
    .single();

  const plan = payment.plan as Plan;
  const tier = planToTier(plan);
  const lifetime = isLifetimePlan(plan);

  // Lifetime: nggak pernah kedaluwarsa (vip_expires_at = null). Bulanan:
  // perpanjang 30 hari dari sekarang, atau dari tanggal expired saat ini
  // kalau membership-nya masih aktif (biar nggak "hangus" sisa waktunya).
  const now = new Date();
  const currentExpiry = profile?.vip_expires_at ? new Date(profile.vip_expires_at) : null;
  const base = currentExpiry && currentExpiry > now ? currentExpiry : now;
  const newExpiry = lifetime ? null : new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);

  await service
    .from("profiles")
    .update({ tier, vip_expires_at: newExpiry ? newExpiry.toISOString() : null })
    .eq("id", payment.user_id);

  const expiryLabel = newExpiry
    ? `sampai ${newExpiry.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`
    : "selamanya (lifetime)";

  await notifyUser({
    userId: payment.user_id,
    email: profile?.email ?? null,
    type: "TIER_UPGRADE",
    title: `Pembayaran ${plan} berhasil`,
    message: `Pembayaran kamu sudah kami terima. Akun kamu sekarang aktif sebagai ${tier} ${expiryLabel}.`,
    client: service,
  });

  return { status: "COMPLETED" };
}
