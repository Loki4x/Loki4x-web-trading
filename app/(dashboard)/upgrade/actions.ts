"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createPakasirTransaction, type PakasirMethod } from "@/lib/pakasir";
import { finalizePakasirPayment } from "@/lib/pakasir-fulfillment";
import { generateQrDataUrl } from "@/lib/qrcode";
import { uploadToR2 } from "@/lib/r2";
import { PLAN_PRICE_IDR, PAKASIR_METHODS, purchasablePlans, type Plan } from "@/lib/pakasir-constants";
import { getMembershipStatus } from "@/lib/tier";
import { getT } from "@/lib/i18n/server";
import { rateLimit } from "@/lib/rate-limit";
import { USDT_PRICE, type UsdtNetwork } from "@/lib/usdt";

export async function submitVipRequest(formData: FormData) {
  const { t } = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  if (!(await rateLimit(`vip-request:${user.id}`, 3, 86400))) {
    throw new Error(t("Terlalu banyak percobaan. Coba lagi dalam beberapa menit."));
  }

  const brokerEmail = String(formData.get("broker_email") ?? "");
  const tradingAccountId = String(formData.get("trading_account_id") ?? "");
  const firstDeposit = Number(formData.get("first_deposit"));

  if (!brokerEmail || !tradingAccountId || !firstDeposit) {
    throw new Error(t("Semua kolom wajib diisi"));
  }

  if (firstDeposit < 15) {
    throw new Error(t("Deposit pertama minimal $15"));
  }

  await supabase.from("vip_ib_requests").insert({
    user_id: user.id,
    broker_email: brokerEmail,
    trading_account_id: tradingAccountId,
    first_deposit: firstDeposit,
    status: "PENDING",
  });

  revalidatePath("/upgrade");
}

export async function createInstantPayment({ plan, method }: { plan: Plan; method: PakasirMethod }) {
  const { t } = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  if (!(await rateLimit(`pay-create:${user.id}`, 10, 3600))) {
    throw new Error(t("Terlalu banyak percobaan. Coba lagi dalam beberapa menit."));
  }

  // `plan` dan `method` datang dari client, jadi jangan dipercaya begitu saja.
  // Paket harus salah satu yang memang boleh dibeli akun ini (mencegah downgrade
  // tak sengaja & pembelian lifetime dua kali), dan `method` masuk ke path URL
  // API Pakasir sehingga wajib dari daftar yang sudah ditentukan.
  const status = await getMembershipStatus();
  if (!purchasablePlans(status).includes(plan)) {
    throw new Error(t("Paket ini tidak tersedia untuk akun kamu saat ini."));
  }
  if (!PAKASIR_METHODS.includes(method)) {
    throw new Error(t("Metode pembayaran tidak valid."));
  }

  const amount = PLAN_PRICE_IDR[plan];
  const orderId = `LOKI4X-${user.id.slice(0, 8)}-${Date.now()}`;

  const created = await createPakasirTransaction({ method, orderId, amount });
  if (!created) throw new Error(t("Gagal membuat transaksi pembayaran, coba lagi."));

  const service = createServiceClient();
  const { error } = await service.from("payments").insert({
    user_id: user.id,
    order_id: orderId,
    plan,
    amount,
    status: "PENDING",
    payment_method: method,
    payment_number: created.payment_number,
    expired_at: created.expired_at,
    currency: "IDR",
  });
  if (error) throw new Error(t("Gagal menyimpan order pembayaran"));

  const qrImage = method === "qris" ? await generateQrDataUrl(created.payment_number) : null;

  return {
    orderId,
    amount,
    totalPayment: created.total_payment,
    paymentNumber: created.payment_number,
    qrImage,
    expiredAt: created.expired_at,
    method,
  };
}

export async function checkInstantPaymentStatus(orderId: string) {
  const { t } = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // RLS di tabel payments cuma izinin user lihat order miliknya sendiri —
  // kalau order_id ini bukan punya dia, query ini balikin null.
  const { data: owned } = await supabase.from("payments").select("id").eq("order_id", orderId).single();
  if (!owned) throw new Error(t("Order tidak ditemukan"));

  const result = await finalizePakasirPayment(orderId);
  return result.status;
}

export async function submitUsdtPayment(formData: FormData) {
  const { t } = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  if (!(await rateLimit(`usdt-proof:${user.id}`, 3, 3600))) {
    throw new Error(t("Terlalu banyak percobaan. Coba lagi dalam beberapa menit."));
  }

  const plan = String(formData.get("plan"));
  if (plan !== "VIP" && plan !== "MEMBERSHIP" && plan !== "MEMBERSHIP_LIFETIME") throw new Error(t("Paket tidak valid"));

  const status = await getMembershipStatus();
  if (!purchasablePlans(status).includes(plan)) {
    throw new Error(t("Paket ini tidak tersedia untuk akun kamu saat ini."));
  }

  const network = String(formData.get("network")) as UsdtNetwork;
  if (network !== "BEP20" && network !== "TRC20") throw new Error(t("Network tidak valid"));

  const slip = formData.get("slip") as File | null;
  if (!slip || slip.size === 0) throw new Error(t("Bukti transfer wajib diupload"));

  const note = String(formData.get("note") ?? "").trim() || null;

  const slipUrl = await uploadToR2(slip, `usdt-slips/${user.id}`);
  if (!slipUrl) throw new Error(t("Gagal upload bukti transfer"));

  const amount = USDT_PRICE[plan];
  const orderId = `USDT-${user.id.slice(0, 8)}-${Date.now()}`;

  const service = createServiceClient();
  const { error } = await service.from("payments").insert({
    user_id: user.id,
    order_id: orderId,
    plan,
    amount,
    currency: "USDT",
    status: "PENDING",
    payment_method: `usdt_${network.toLowerCase()}`,
    slip_url: slipUrl,
    note,
  });
  if (error) throw new Error(t("Gagal menyimpan pengajuan pembayaran"));

  revalidatePath("/upgrade");
}
