import { getUserT } from "@/lib/i18n/server";
import { dateLocale } from "@/lib/i18n/dictionary";
import { createServiceClient } from "@/lib/supabase/service";
import { getPakasirTransactionDetail } from "@/lib/pakasir";
import { notifyUser } from "@/lib/notifications";
import { type Plan } from "@/lib/pakasir-constants";
import { computeGrant } from "@/lib/membership-grant";

/**
 * Verifikasi status transaksi ke Pakasir (Transaction Detail API, bukan
 * cuma percaya body webhook), lalu kalau memang lunas: upgrade tier user
 * + kirim notifikasi. Idempotent — aman dipanggil berkali-kali untuk
 * order_id yang sama (dari webhook maupun dari tombol "Cek Status" user),
 * termasuk kalau dipanggil bersamaan.
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

  // "Klaim" pembayaran secara atomik SEBELUM memberi akses. UPDATE ... WHERE
  // status <> 'COMPLETED' dieksekusi Postgres per-baris dengan row lock, jadi
  // kalau webhook dan "Cek Status" (atau klik beruntun) masuk bersamaan, hanya
  // satu yang dapat baris kembali. Sisanya berhenti di sini, tidak menambah
  // masa aktif lagi. (Versi lama: baca status lalu update — celah race.)
  const { data: claimed } = await service
    .from("payments")
    .update({
      status: "COMPLETED",
      payment_method: transaction.payment_method,
      completed_at: transaction.completed_at ?? new Date().toISOString(),
    })
    .eq("order_id", orderId)
    .neq("status", "COMPLETED")
    .select("id")
    .maybeSingle();

  if (!claimed) return { status: "COMPLETED" }; // sudah diproses oleh request lain

  const { data: profile } = await service
    .from("profiles")
    .select("tier, vip_expires_at, email")
    .eq("id", payment.user_id)
    .single();

  const plan = payment.plan as Plan;

  // Tier & masa aktif baru dihitung lewat helper bersama (tidak menurunkan tier aktif,
  // tidak menimpa Lifetime dengan paket bulanan).
  const grant = computeGrant({ tier: profile?.tier ?? null, vip_expires_at: profile?.vip_expires_at ?? null }, plan);
  const tier = grant.tier as string;
  const newExpiry = grant.vip_expires_at ? new Date(grant.vip_expires_at) : null;

  const { error: upgradeError } = await service
    .from("profiles")
    .update({ tier: grant.tier, vip_expires_at: grant.vip_expires_at })
    .eq("id", payment.user_id);

  if (upgradeError) {
    // Upgrade gagal: kembalikan klaim supaya pembayaran ini bisa diproses ulang
    // (webhook Pakasir akan retry karena kita balas 400, atau user klik "Cek Status").
    console.error(`[pakasir] Gagal upgrade tier untuk order ${orderId}, klaim dikembalikan:`, upgradeError);
    await service
      .from("payments")
      .update({ status: payment.status, completed_at: null })
      .eq("order_id", orderId);
    return { status: "PENDING" };
  }

  const { t: tu, locale: userLocale } = await getUserT(service, payment.user_id);
  const expiryLabel = newExpiry
    ? tu("sampai {date}", {
        date: newExpiry.toLocaleDateString(dateLocale(userLocale), { day: "numeric", month: "long", year: "numeric" }),
      })
    : tu("selamanya (lifetime)");

  // User sudah terlanjur di-upgrade di titik ini, jadi gagal kirim notifikasi
  // tidak boleh membatalkan apa pun.
  try {
    await notifyUser({
      userId: payment.user_id,
      email: profile?.email ?? null,
      type: "TIER_UPGRADE",
      title: tu("Pembayaran {plan} berhasil", { plan }),
      message: tu("Pembayaran kamu sudah kami terima. Akun kamu sekarang aktif sebagai {tier} {expiry}.", { tier, expiry: expiryLabel }),
      client: service,
    });
  } catch (err) {
    console.error(`[pakasir] Notifikasi gagal untuk order ${orderId} (upgrade tetap berhasil):`, err);
  }

  return { status: "COMPLETED" };
}
