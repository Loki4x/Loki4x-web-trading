"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createPakasirTransaction, type PakasirMethod } from "@/lib/pakasir";
import { finalizePakasirPayment } from "@/lib/pakasir-fulfillment";
import { generateQrDataUrl } from "@/lib/qrcode";
import { uploadToR2 } from "@/lib/r2";
import { PLAN_PRICE_IDR, type Plan } from "@/lib/pakasir-constants";
import { USDT_PRICE, type UsdtNetwork } from "@/lib/usdt";

export async function submitVipRequest(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const brokerEmail = String(formData.get("broker_email") ?? "");
  const tradingAccountId = String(formData.get("trading_account_id") ?? "");
  const firstDeposit = Number(formData.get("first_deposit"));

  if (!brokerEmail || !tradingAccountId || !firstDeposit) {
    throw new Error("Semua kolom wajib diisi");
  }

  if (firstDeposit < 15) {
    throw new Error("Deposit pertama minimal $15");
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const amount = PLAN_PRICE_IDR[plan];
  const orderId = `LOKI4X-${user.id.slice(0, 8)}-${Date.now()}`;

  const created = await createPakasirTransaction({ method, orderId, amount });
  if (!created) throw new Error("Gagal membuat transaksi pembayaran, coba lagi.");

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
  if (error) throw new Error("Gagal menyimpan order pembayaran");

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
  const result = await finalizePakasirPayment(orderId);
  return result.status;
}

export async function submitUsdtPayment(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const plan = String(formData.get("plan"));
  if (plan !== "VIP" && plan !== "MEMBERSHIP" && plan !== "MEMBERSHIP_LIFETIME") throw new Error("Paket tidak valid");

  const network = String(formData.get("network")) as UsdtNetwork;
  if (network !== "BEP20" && network !== "TRC20") throw new Error("Network tidak valid");

  const slip = formData.get("slip") as File | null;
  if (!slip || slip.size === 0) throw new Error("Bukti transfer wajib diupload");

  const note = String(formData.get("note") ?? "").trim() || null;

  const slipUrl = await uploadToR2(slip, `usdt-slips/${user.id}`);
  if (!slipUrl) throw new Error("Gagal upload bukti transfer");

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
  if (error) throw new Error("Gagal menyimpan pengajuan pembayaran");

  revalidatePath("/upgrade");
}
