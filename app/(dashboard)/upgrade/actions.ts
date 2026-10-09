"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createPakasirTransaction, type PakasirMethod } from "@/lib/pakasir";
import { finalizePakasirPayment } from "@/lib/pakasir-fulfillment";
import { generateQrDataUrl } from "@/lib/qrcode";
import { uploadPrivateToR2, UPLOAD_MAX_BYTES, isAllowedUploadType } from "@/lib/r2";
import { isEmail } from "@/lib/validation";
import { PLAN_PRICE_IDR, PAKASIR_METHODS, purchasablePlans, type Plan } from "@/lib/pakasir-constants";
import { getMembershipStatus } from "@/lib/tier";
import { getT } from "@/lib/i18n/server";
import { rateLimit } from "@/lib/rate-limit";
import { USDT_PRICE, type UsdtNetwork } from "@/lib/usdt";
import { quotePromo, type PromoError, type PromoQuote } from "@/lib/promo";

// Di produksi, Next.js menyamarkan pesan dari `throw new Error(...)` di server action menjadi teks umum
// ("An error occurred in the Server Components render..."), jadi user tidak pernah melihat alasannya.
// Karena itu aksi di bawah MENGEMBALIKAN { ok: false, message } untuk error yang bisa dijelaskan ke user.
const fail = (message: string) => ({ ok: false as const, message });

async function safely<T>(label: string, fn: () => Promise<T>): Promise<T | ReturnType<typeof fail>> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[upgrade/${label}]`, err);
    const { t } = await getT();
    return fail(t("Terjadi kesalahan."));
  }
}

async function submitVipRequestImpl(formData: FormData) {
  const { t } = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return fail(t("Sesi kamu berakhir. Silakan masuk lagi."));

  if (!(await rateLimit(`vip-request:${user.id}`, 3, 86400))) {
    return fail(t("Terlalu banyak percobaan. Coba lagi dalam beberapa menit."));
  }

  const brokerEmail = String(formData.get("broker_email") ?? "").trim().slice(0, 254);
  const tradingAccountId = String(formData.get("trading_account_id") ?? "").trim().slice(0, 64);
  const firstDeposit = Number(formData.get("first_deposit"));

  if (!brokerEmail || !tradingAccountId || !firstDeposit) {
    return fail(t("Semua kolom wajib diisi"));
  }

  if (firstDeposit < 15) {
    return fail(t("Deposit pertama minimal $15"));
  }

  if (!isEmail(brokerEmail)) return fail(t("Format email broker tidak valid."));
  if (!/^[A-Za-z0-9._-]{3,64}$/.test(tradingAccountId)) {
    return fail(t("ID akun trading hanya boleh berisi huruf, angka, titik, garis bawah, atau tanda hubung (3-64 karakter)."));
  }
  if (!Number.isFinite(firstDeposit) || firstDeposit > 10_000_000) return fail(t("Jumlah deposit tidak valid."));

  const { error: insertError } = await supabase.from("vip_ib_requests").insert({
    user_id: user.id,
    broker_email: brokerEmail,
    trading_account_id: tradingAccountId,
    first_deposit: firstDeposit,
    status: "PENDING",
  });
  if (insertError) {
    console.error("[upgrade/submitVipRequest] gagal menyimpan:", insertError.message);
    return fail(t("Gagal mengirim pengajuan"));
  }

  revalidatePath("/upgrade");
  return { ok: true as const };
}

export async function submitVipRequest(formData: FormData) {
  return safely("submitVipRequest", () => submitVipRequestImpl(formData));
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
  if (!user) return { ok: false, message: t("Sesi kamu berakhir. Silakan masuk lagi.") };

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

async function createInstantPaymentImpl({
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
  if (!user) return fail(t("Sesi kamu berakhir. Silakan masuk lagi."));

  if (!(await rateLimit(`pay-create:${user.id}`, 10, 3600))) {
    return fail(t("Terlalu banyak percobaan. Coba lagi dalam beberapa menit."));
  }

  // `plan` dan `method` datang dari client, jadi jangan dipercaya begitu saja.
  // Paket harus salah satu yang memang boleh dibeli akun ini (mencegah downgrade
  // tak sengaja & pembelian lifetime dua kali), dan `method` masuk ke path URL
  // API Pakasir sehingga wajib dari daftar yang sudah ditentukan.
  const status = await getMembershipStatus();
  if (!purchasablePlans(status).includes(plan)) {
    return fail(t("Paket ini tidak tersedia untuk akun kamu saat ini."));
  }
  if (!PAKASIR_METHODS.includes(method)) {
    return fail(t("Metode pembayaran tidak valid."));
  }

  // Harga SELALU dihitung di server. Kalau ada kode promo, divalidasi ulang di sini
  // (bukan percaya hasil preview dari browser).
  let amount = PLAN_PRICE_IDR[plan];
  let promo: { id: string; code: string; original: number; discount: number } | null = null;
  if (promoCode && promoCode.trim()) {
    const quoted = await quotePromo(createServiceClient(), { code: promoCode, plan, userId: user.id });
    if (!quoted.ok) return fail(t(PROMO_MESSAGE[quoted.error]));
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
  if (!created) return fail(t("Gagal membuat transaksi pembayaran, coba lagi."));

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
  if (error) return fail(t("Gagal menyimpan order pembayaran"));

  const qrImage = method === "qris" ? await generateQrDataUrl(created.payment_number) : null;

  return {
    ok: true as const,
    orderId,
    amount,
    totalPayment: created.total_payment,
    paymentNumber: created.payment_number,
    qrImage,
    expiredAt: created.expired_at,
    method,
  };
}

export async function createInstantPayment(args: {
  plan: Plan;
  method: PakasirMethod;
  promoCode?: string | null;
}) {
  return safely("createInstantPayment", () => createInstantPaymentImpl(args));
}

export async function checkInstantPaymentStatus(orderId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // RLS di tabel payments cuma izinin user lihat order miliknya sendiri —
  // kalau order_id ini bukan punya dia, query ini balikin null.
  const { data: owned } = await supabase.from("payments").select("id").eq("order_id", orderId).single();
  if (!owned) return null;

  try {
    const result = await finalizePakasirPayment(orderId);
    return result.status;
  } catch (err) {
    console.error("[upgrade/checkInstantPaymentStatus]", err);
    return null;
  }
}

async function submitUsdtPaymentImpl(formData: FormData) {
  const { t } = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(t("Sesi kamu berakhir. Silakan masuk lagi."));

  if (!(await rateLimit(`usdt-proof:${user.id}`, 3, 3600))) {
    return fail(t("Terlalu banyak percobaan. Coba lagi dalam beberapa menit."));
  }

  const plan = String(formData.get("plan"));
  if (plan !== "VIP" && plan !== "MEMBERSHIP" && plan !== "MEMBERSHIP_LIFETIME") return fail(t("Paket tidak valid"));

  const status = await getMembershipStatus();
  if (!purchasablePlans(status).includes(plan)) {
    return fail(t("Paket ini tidak tersedia untuk akun kamu saat ini."));
  }

  const network = String(formData.get("network")) as UsdtNetwork;
  if (network !== "BEP20" && network !== "TRC20") return fail(t("Network tidak valid"));

  const slip = formData.get("slip") as File | null;
  if (!slip || slip.size === 0) return fail(t("Bukti transfer wajib diupload"));

  const note = String(formData.get("note") ?? "").trim().slice(0, 500) || null;

  if (!isAllowedUploadType(slip.type)) return fail(t("Format bukti transfer harus JPG, PNG, WebP, GIF, atau PDF."));
  if (slip.size > UPLOAD_MAX_BYTES) return fail(t("Ukuran bukti transfer maksimal 2 MB."));

  const slipUrl = await uploadPrivateToR2(slip, `usdt-slips/${user.id}`);
  if (!slipUrl) return fail(t("Gagal upload bukti transfer. Coba lagi, atau hubungi admin kalau terus gagal."));

  let amount: number = USDT_PRICE[plan];
  let promo: { id: string; code: string; original: number; discount: number } | null = null;
  const promoCode = String(formData.get("promo_code") ?? "").trim();
  if (promoCode) {
    const quoted = await quotePromo(createServiceClient(), { code: promoCode, plan, userId: user.id });
    if (!quoted.ok) return fail(t(PROMO_MESSAGE[quoted.error]));
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
  if (error) return fail(t("Gagal menyimpan pengajuan pembayaran"));

  revalidatePath("/upgrade");
  return { ok: true as const };
}

export async function submitUsdtPayment(formData: FormData) {
  return safely("submitUsdtPayment", () => submitUsdtPaymentImpl(formData));
}
