import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getPakasirTransactionDetail } from "@/lib/pakasir";
import { notifyUser } from "@/lib/notifications";

// Pakasir POSTs here whenever a payment completes.
// Docs: https://pakasir.com/p/docs (bagian D. Webhook)
//
// Set URL ini sebagai "Webhook URL" di halaman edit proyek Pakasir kamu:
//   https://<domain-kamu>/api/pakasir/webhook
//
// Pakasir tidak menandatangani (sign) payload webhook-nya, jadi kita tidak
// langsung percaya isi body-nya — kita cek ulang statusnya lewat Transaction
// Detail API (pakai API key kita sendiri, server-side) sebelum upgrade tier.
export async function POST(request: Request) {
  let body: { order_id?: string; amount?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderId = body.order_id;
  if (!orderId || !body.amount) {
    return NextResponse.json({ error: "Missing order_id/amount" }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: payment } = await service.from("payments").select("*").eq("order_id", orderId).single();

  if (!payment) {
    return NextResponse.json({ error: "Unknown order_id" }, { status: 404 });
  }

  if (payment.status === "COMPLETED") {
    return NextResponse.json({ ok: true }); // sudah pernah diproses, jangan upgrade dobel
  }

  // Verifikasi langsung ke Pakasir, jangan cuma percaya body webhook.
  const transaction = await getPakasirTransactionDetail({ orderId, amount: payment.amount });

  if (!transaction || transaction.status !== "completed" || transaction.amount !== payment.amount) {
    return NextResponse.json({ error: "Transaction not verified as completed" }, { status: 400 });
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

  // Perpanjang 30 hari dari sekarang, atau dari tanggal expired saat ini
  // kalau membership-nya masih aktif (biar nggak "hangus" sisa waktunya).
  const now = new Date();
  const currentExpiry = profile?.vip_expires_at ? new Date(profile.vip_expires_at) : null;
  const base = currentExpiry && currentExpiry > now ? currentExpiry : now;
  const newExpiry = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);

  await service
    .from("profiles")
    .update({ tier: payment.plan, vip_expires_at: newExpiry.toISOString() })
    .eq("id", payment.user_id);

  const expiryLabel = newExpiry.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  await notifyUser({
    userId: payment.user_id,
    email: profile?.email ?? null,
    type: "TIER_UPGRADE",
    title: `Pembayaran ${payment.plan} berhasil`,
    message: `Pembayaran kamu sudah kami terima. Akun kamu sekarang aktif sebagai ${payment.plan} sampai ${expiryLabel}.`,
    client: service,
  });

  return NextResponse.json({ ok: true });
}

