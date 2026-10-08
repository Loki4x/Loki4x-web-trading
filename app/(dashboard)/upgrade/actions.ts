"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createPakasirTransaction, type PakasirMethod } from "@/lib/pakasir";
import { finalizePakasirPayment } from "@/lib/pakasir-fulfillment";
import { generateQrDataUrl } from "@/lib/qrcode";
import { uploadPrivateToR2 } from "@/lib/r2";
import { isEmail } from "@/lib/validation";
import { PLAN_PRICE_IDR, PAKASIR_METHODS, purchasablePlans, type Plan } from "@/lib/pakasir-constants";
import { getMembershipStatus } from "@/lib/tier";
import { getT } from "@/lib/i18n/server";
import { rateLimit } from "@/lib/rate-limit";
import { USDT_PRICE, type UsdtNetwork } from "@/lib/usdt";
import { quotePromo, type PromoError, type PromoQuote } from "@/lib/promo";

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

  const brokerEmail = String(formData.get("broker_email") ?? "").trim().slice(0, 254);
  const tradingAccountId = String(formData.get("trading_account_id") ?? "").trim().slice(0, 64);
  const firstDeposit = Number(formData.get("first_deposit"));

  if (!brokerEmail || !tradingAccountId || !firstDeposit) {
    throw new Error(t("Semua kolom wajib diisi"));
  }

  if (firstDeposit < 15) {
    throw new Error(t("Deposit pertama minimal $15"));
  }

  if (!isEmail(brokerEmail) || !/^[A-Za-z0-9._-]{3,64}$/.test(tradingAccountId) || !Number.isFinite(firstDeposit) || firstDeposit > 10_000_000) {
    throw new Error(t("Semua kolom wajib diisi"));
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

const PROMO_MESSAGE: Record<PromoError, string> = {
  INVALID: "Kode promo tidak valid atau sudah tidak berlaku.",
  PLAN_NOT_ALLOWED: "Kode ini tidak berlaku untuk paket yang dipilih.",
  ALREADY_USED: "Kamu sudah pernah memakai kode ini.",
  TOO_LOW: "Kode ini tidak bisa dipakai untuk paket ini.",
};

export type PromoPreview =
  | { ok: true; code: string; idr: PromoQuote["idr"]; usdt: PromoQuote["usdt"] }
  | { ok: false; message: string };

/** Cek kode promo untuk ditampilkan di modal pembayaran. Harga final selalu dihitung ulang saat order dibuat. */
export async function previewPromoCode({ plan, code }: { plan: Plan; code: string }): Promise<PromoPreview> {
  const { t } = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Batasi percobaan supaya kode tidak bisa ditebak-tebak.
  if (!(await rateLimit(`promo-preview:${user.id}`, 20, 600))) {
    return { ok: false, message: t("Terlalu banyak percobaan. Coba lagi dalam beberapa menit.") };
  }
  if (plan !== "VIP" && plan !== "MEMBERSHIP" && plan !== "MEMBERSHIP_LIFETIME") {
    return { ok: false, message: t("Paket tidak valid") };
  }
  const status = await getMembershipStatus();
  if (!purchasablePlans(status).includes(plan)) {
    return { ok: false, message: t("Paket ini tidak tersedia untuk akun kamu saat ini.") };
  }

  const result = await quotePromo(createServiceClient(), { code, plan, userId: user.id });
  if (!result.ok) return { ok: false, message: t(PROMO_MESSAGE[result.error]) };
  return { ok: true, code: result.quote.code, idr: result.quote.idr, usdt: result.quote.usdt };
}

export async function createInstantPayment({
  plan,
  method,
  promoCode,
}: {
  plan: Plan;
  method: PakasirMethod;
  promoCode?: string | null;
}) {
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

  // Harga SELALU dihitung di server. Kalau ada kode promo, divalidasi ulang di sini
  // (bukan percaya hasil preview dari browser).
  let amount = PLAN_PRICE_IDR[plan];
  let promo: { id: string; code: string; original: number; discount: number } | null = null;
  if (promoCode && promoCode.trim()) {
    const quoted = await quotePromo(createServiceClient(), { code: promoCode, plan, userId: user.id });
    if (!quoted.ok) throw new Error(t(PROMO_MESSAGE[quoted.error]));
    amount = quoted.quote.idr.final;
    promo = {
      id: quoted.quote.codeId,
      code: quoted.quote.code,
      original: quoted.quote.idr.original,
      discount: quoted.quote.idr.discount,
    };
  }
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
    promo_code_id: promo?.id ?? null,
    promo_code: promo?.code ?? null,
    original_amount: promo?.original ?? amount,
    discount_amount: promo?.discount ?? 0,
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

  const note = String(formData.get("note") ?? "").trim().slice(0, 500) || null;

  const slipUrl = await uploadPrivateToR2(slip, `usdt-slips/${user.id}`);
  if (!slipUrl) throw new Error(t("Gagal upload bukti transfer"));

  let amount: number = USDT_PRICE[plan];
  let promo: { id: string; code: string; original: number; discount: number } | null = null;
  const promoCode = String(formData.get("promo_code") ?? "").trim();
  if (promoCode) {
    const quoted = await quotePromo(createServiceClient(), { code: promoCode, plan, userId: user.id });
    if (!quoted.ok) throw new Error(t(PROMO_MESSAGE[quoted.error]));
    amount = quoted.quote.usdt.final;
    promo = {
      id: quoted.quote.codeId,
      code: quoted.quote.code,
      original: quoted.quote.usdt.original,
      discount: quoted.quote.usdt.discount,
    };
  }
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
    promo_code_id: promo?.id ?? null,
    promo_code: promo?.code ?? null,
    original_amount: promo?.original ?? amount,
    discount_amount: promo?.discount ?? 0,
  });
  if (error) throw new Error(t("Gagal menyimpan pengajuan pembayaran"));

  revalidatePath("/upgrade");
}
