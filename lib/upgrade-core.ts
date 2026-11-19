import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { createPoketoInvoice, POKETO_MIN_AMOUNT } from "@/lib/poketo";
import { SITE_URL } from "@/lib/site-url";
import { finalizePayment } from "@/lib/payment-fulfillment";
import { uploadPrivateToR2, UPLOAD_MAX_BYTES, isAllowedUploadType } from "@/lib/r2";
import { isEmail } from "@/lib/validation";
import { isIbBroker } from "@/lib/brokers";
import { PLAN_PRICE_IDR, purchasablePlans, type Plan } from "@/lib/payment-constants";
import { membershipStatusOf } from "@/lib/tier";
import { rateLimit } from "@/lib/rate-limit";
import { USDT_PRICE, type UsdtNetwork } from "@/lib/usdt";
import { quotePromo, type PromoError, type PromoQuote } from "@/lib/promo";

/**
 * Inti pembayaran / upgrade yang dipakai bersama oleh server action web (app/(dashboard)/upgrade)
 * dan API aplikasi Android (app/api/mobile/upgrade). Harga, promo, dan paket yang boleh dibeli
 * SELALU dihitung di server di sini.
 */

type T = (key: string, vars?: Record<string, string | number>) => string;
type Getter = (key: string) => unknown;

export interface UpgradeCtx {
  supabase: SupabaseClient;
  userId: string;
  email: string | null;
  t: T;
}

export const fail = (message: string) => ({ ok: false as const, message });
type Fail = ReturnType<typeof fail>;

const text = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const isPlan = (v: unknown): v is Plan => v === "VIP" || v === "MEMBERSHIP" || v === "MEMBERSHIP_LIFETIME";

export const PROMO_MESSAGE: Record<PromoError, string> = {
  INVALID: "Kode promo tidak valid atau sudah tidak berlaku.",
  PLAN_NOT_ALLOWED: "Kode ini tidak berlaku untuk paket yang dipilih.",
  ALREADY_USED: "Kamu sudah pernah memakai kode ini.",
  TOO_LOW: "Kode ini tidak bisa dipakai untuk paket ini.",
};

const PLAN_TITLE: Record<Plan, string> = {
  VIP: "VIP",
  MEMBERSHIP: "Membership",
  MEMBERSHIP_LIFETIME: "Membership Lifetime",
};

async function planAllowed(ctx: UpgradeCtx, plan: Plan) {
  return purchasablePlans(await membershipStatusOf(ctx.supabase, ctx.userId)).includes(plan);
}

// ---------- VIP lewat IB broker ----------

export async function submitVipRequestCore(ctx: UpgradeCtx, get: Getter): Promise<{ ok: true } | Fail> {
  const { t, supabase } = ctx;
  if (!(await rateLimit(`vip-request:${ctx.userId}`, 3, 86400))) {
    return fail(t("Terlalu banyak percobaan. Coba lagi dalam beberapa menit."));
  }
  if (text(get("agree_terms")) !== "on") return fail(t("Kamu harus menyetujui Syarat & Ketentuan VIP via IB."));

  const broker = get("broker");
  if (!isIbBroker(broker)) return fail(t("Pilih broker terlebih dahulu."));

  const brokerEmail = text(get("broker_email")).trim().slice(0, 254);
  const tradingAccountId = text(get("trading_account_id")).trim().slice(0, 64);
  const firstDeposit = Number(get("first_deposit"));

  if (!brokerEmail || !tradingAccountId || !firstDeposit) return fail(t("Semua kolom wajib diisi"));
  if (firstDeposit < 15) return fail(t("Deposit pertama minimal $15"));
  if (!isEmail(brokerEmail)) return fail(t("Format email broker tidak valid."));
  if (!/^[A-Za-z0-9._-]{3,64}$/.test(tradingAccountId)) {
    return fail(t("ID akun trading hanya boleh berisi huruf, angka, titik, garis bawah, atau tanda hubung (3-64 karakter)."));
  }
  if (!Number.isFinite(firstDeposit) || firstDeposit > 10_000_000) return fail(t("Jumlah deposit tidak valid."));

  const { error } = await supabase.from("vip_ib_requests").insert({
    user_id: ctx.userId,
    broker_email: brokerEmail,
    trading_account_id: tradingAccountId,
    broker,
    first_deposit: firstDeposit,
    status: "PENDING",
  });
  if (error) {
    console.error("[upgrade/submitVipRequest] gagal menyimpan:", error.message);
    return fail(t("Gagal mengirim pengajuan"));
  }
  return { ok: true };
}

// ---------- Kode promo ----------

export type PromoPreview =
  | { ok: true; code: string; idr: PromoQuote["idr"]; usdt: PromoQuote["usdt"] }
  | { ok: false; message: string };

export async function previewPromoCore(ctx: UpgradeCtx, plan: unknown, code: unknown): Promise<PromoPreview> {
  const { t } = ctx;
  // Batasi percobaan supaya kode tidak bisa ditebak-tebak.
  if (!(await rateLimit(`promo-preview:${ctx.userId}`, 20, 600))) {
    return fail(t("Terlalu banyak percobaan. Coba lagi dalam beberapa menit."));
  }
  if (!isPlan(plan)) return fail(t("Paket tidak valid"));
  if (!(await planAllowed(ctx, plan))) return fail(t("Paket ini tidak tersedia untuk akun kamu saat ini."));

  const result = await quotePromo(createServiceClient(), { code: text(code), plan, userId: ctx.userId });
  if (!result.ok) return fail(t(PROMO_MESSAGE[result.error]));
  return { ok: true, code: result.quote.code, idr: result.quote.idr, usdt: result.quote.usdt };
}

// ---------- QRIS / Virtual Account (Poketo) ----------

export async function createPoketoPaymentCore(
  ctx: UpgradeCtx,
  plan: unknown,
  promoCode: unknown
): Promise<{ ok: true; orderId: string; amount: number; paymentUrl: string; expiredAt: string } | Fail> {
  const { t } = ctx;
  if (!(await rateLimit(`pay-create:${ctx.userId}`, 10, 3600))) {
    return fail(t("Terlalu banyak percobaan. Coba lagi dalam beberapa menit."));
  }
  // `plan` datang dari klien: harus salah satu paket yang boleh dibeli akun ini.
  if (!isPlan(plan)) return fail(t("Paket tidak valid"));
  if (!(await planAllowed(ctx, plan))) return fail(t("Paket ini tidak tersedia untuk akun kamu saat ini."));

  // Harga SELALU dihitung di server; kode promo divalidasi ulang di sini.
  let amount = PLAN_PRICE_IDR[plan];
  let promo: { id: string; code: string; original: number; discount: number } | null = null;
  const code = text(promoCode).trim();
  if (code) {
    const quoted = await quotePromo(createServiceClient(), { code, plan, userId: ctx.userId });
    if (!quoted.ok) return fail(t(PROMO_MESSAGE[quoted.error]));
    amount = quoted.quote.idr.final;
    promo = {
      id: quoted.quote.codeId,
      code: quoted.quote.code,
      original: quoted.quote.idr.original,
      discount: quoted.quote.idr.discount,
    };
  }
  if (amount < POKETO_MIN_AMOUNT) return fail(t("Nominal pembayaran terlalu kecil."));

  const service = createServiceClient();
  const { data: profile } = await service.from("profiles").select("full_name, email").eq("id", ctx.userId).maybeSingle();

  const orderId = `LOKI4X-${ctx.userId.slice(0, 8)}-${Date.now()}`;
  const invoice = await createPoketoInvoice({
    orderId,
    amount,
    title: `Loki4x Academy - ${PLAN_TITLE[plan]}`,
    description: `Akses ${PLAN_TITLE[plan]} Loki4x Academy`,
    customer: { name: profile?.full_name ?? null, email: ctx.email ?? profile?.email ?? null },
    redirectUrl: `${SITE_URL}/upgrade`,
    expiresInMinutes: 1440,
  });
  if (!invoice) return fail(t("Gagal membuat transaksi pembayaran, coba lagi."));

  const { error } = await service.from("payments").insert({
    user_id: ctx.userId,
    order_id: orderId,
    plan,
    amount,
    status: "PENDING",
    payment_method: "poketo",
    payment_number: invoice.paymentUrl, // URL halaman bayar
    pakasir_txn_id: invoice.id, // nama kolom warisan; berisi ID tagihan Poketo
    expired_at: invoice.expiresAt || null,
    currency: "IDR",
    promo_code_id: promo?.id ?? null,
    promo_code: promo?.code ?? null,
    original_amount: promo?.original ?? amount,
    discount_amount: promo?.discount ?? 0,
  });
  if (error) {
    console.error("[upgrade/createPoketoPayment] gagal menyimpan order:", error.message);
    return fail(t("Gagal menyimpan order pembayaran"));
  }

  return { ok: true, orderId, amount, paymentUrl: invoice.paymentUrl, expiredAt: invoice.expiresAt ?? "" };
}

/** Cek & selesaikan order milik user. null = bukan order miliknya / gagal. */
export async function checkPaymentStatusCore(ctx: UpgradeCtx, orderId: string) {
  // RLS di tabel payments cuma izinin user lihat order miliknya sendiri.
  const { data: owned } = await ctx.supabase.from("payments").select("id").eq("order_id", orderId).maybeSingle();
  if (!owned) return null;
  try {
    return (await finalizePayment(orderId)).status;
  } catch (err) {
    console.error("[upgrade/checkInstantPaymentStatus]", err);
    return null;
  }
}

// ---------- USDT (bukti transfer, diverifikasi admin) ----------

export async function submitUsdtPaymentCore(ctx: UpgradeCtx, get: Getter, slip: File | null): Promise<{ ok: true } | Fail> {
  const { t } = ctx;
  if (!(await rateLimit(`usdt-proof:${ctx.userId}`, 3, 3600))) {
    return fail(t("Terlalu banyak percobaan. Coba lagi dalam beberapa menit."));
  }

  const plan = get("plan");
  if (!isPlan(plan)) return fail(t("Paket tidak valid"));
  if (!(await planAllowed(ctx, plan))) return fail(t("Paket ini tidak tersedia untuk akun kamu saat ini."));

  const network = text(get("network")) as UsdtNetwork;
  if (network !== "BEP20" && network !== "TRC20") return fail(t("Network tidak valid"));

  if (!slip || slip.size === 0) return fail(t("Bukti transfer wajib diupload"));
  const note = text(get("note")).trim().slice(0, 500) || null;

  if (!isAllowedUploadType(slip.type)) return fail(t("Format bukti transfer harus JPG, PNG, WebP, GIF, atau PDF."));
  if (slip.size > UPLOAD_MAX_BYTES) return fail(t("Ukuran bukti transfer maksimal 2 MB."));

  const slipUrl = await uploadPrivateToR2(slip, `usdt-slips/${ctx.userId}`);
  if (!slipUrl) return fail(t("Gagal upload bukti transfer. Coba lagi, atau hubungi admin kalau terus gagal."));

  let amount: number = USDT_PRICE[plan];
  let promo: { id: string; code: string; original: number; discount: number } | null = null;
  const promoCode = text(get("promo_code")).trim();
  if (promoCode) {
    const quoted = await quotePromo(createServiceClient(), { code: promoCode, plan, userId: ctx.userId });
    if (!quoted.ok) return fail(t(PROMO_MESSAGE[quoted.error]));
    amount = quoted.quote.usdt.final;
    promo = {
      id: quoted.quote.codeId,
      code: quoted.quote.code,
      original: quoted.quote.usdt.original,
      discount: quoted.quote.usdt.discount,
    };
  }
  const orderId = `USDT-${ctx.userId.slice(0, 8)}-${Date.now()}`;

  const { error } = await createServiceClient().from("payments").insert({
    user_id: ctx.userId,
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
  return { ok: true };
}
