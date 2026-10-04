import type { SupabaseClient } from "@supabase/supabase-js";
import { PLAN_PRICE_IDR, type Plan } from "@/lib/pakasir-constants";
import { USDT_PRICE } from "@/lib/usdt";

export type PromoType = "PERCENT" | "FIXED_IDR";

export interface PromoRow {
  id: string;
  code: string;
  type: PromoType;
  value: number;
  max_uses: number | null;
  used_count: number;
  valid_from: string | null;
  valid_until: string | null;
  plans: string[] | null;
  active: boolean;
}

export type PromoError =
  | "INVALID" // tidak ada / nonaktif / di luar masa berlaku / kuota habis (sengaja disamarkan)
  | "PLAN_NOT_ALLOWED"
  | "ALREADY_USED"
  | "TOO_LOW";

export interface PromoQuote {
  codeId: string;
  code: string;
  idr: { original: number; discount: number; final: number };
  usdt: { original: number; discount: number; final: number };
}

// Harga akhir tidak boleh terlalu kecil (batas minimal gateway pembayaran & USDT).
export const MIN_FINAL_IDR = 10_000;
export const MIN_FINAL_USDT = 1;

export function normalizePromoCode(raw: unknown): string {
  return String(raw ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

export const PROMO_CODE_PATTERN = /^[A-Z0-9_-]{3,32}$/;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Hitung diskon murni (tanpa cek database). */
export function computeDiscount(promo: Pick<PromoRow, "type" | "value">, plan: Plan): PromoQuote["idr"] & { usdt: PromoQuote["usdt"] } {
  const originalIdr = PLAN_PRICE_IDR[plan];
  const originalUsdt = USDT_PRICE[plan];

  let discountIdr: number;
  let ratio: number; // porsi diskon, dipakai juga untuk harga USDT
  if (promo.type === "PERCENT") {
    ratio = Math.min(Math.max(Number(promo.value), 0), 100) / 100;
    discountIdr = Math.floor(originalIdr * ratio);
  } else {
    discountIdr = Math.min(Math.floor(Number(promo.value)), originalIdr);
    ratio = discountIdr / originalIdr;
  }
  const discountUsdt = round2(originalUsdt * ratio);

  return {
    original: originalIdr,
    discount: discountIdr,
    final: originalIdr - discountIdr,
    usdt: { original: originalUsdt, discount: discountUsdt, final: round2(originalUsdt - discountUsdt) },
  };
}

/**
 * Cek kode promo untuk satu user & paket, lalu hitung harga akhir. SEMUA dihitung di server;
 * angka dari browser tidak pernah dipercaya. Memakai service client karena tabel promo_codes
 * sengaja tertutup untuk user biasa.
 */
export async function quotePromo(
  service: SupabaseClient,
  input: { code: unknown; plan: Plan; userId: string },
  now = new Date()
): Promise<{ ok: true; quote: PromoQuote } | { ok: false; error: PromoError }> {
  const code = normalizePromoCode(input.code);
  if (!PROMO_CODE_PATTERN.test(code)) return { ok: false, error: "INVALID" };

  const { data } = await service
    .from("promo_codes")
    .select("id, code, type, value, max_uses, used_count, valid_from, valid_until, plans, active")
    .eq("code", code)
    .maybeSingle();
  const promo = data as PromoRow | null;

  if (!promo || !promo.active) return { ok: false, error: "INVALID" };
  if (promo.valid_from && new Date(promo.valid_from) > now) return { ok: false, error: "INVALID" };
  if (promo.valid_until && new Date(promo.valid_until) < now) return { ok: false, error: "INVALID" };
  if (promo.max_uses !== null && promo.used_count >= promo.max_uses) return { ok: false, error: "INVALID" };
  if (promo.plans && promo.plans.length > 0 && !promo.plans.includes(input.plan)) {
    return { ok: false, error: "PLAN_NOT_ALLOWED" };
  }

  const { data: used } = await service
    .from("promo_redemptions")
    .select("id")
    .eq("code_id", promo.id)
    .eq("user_id", input.userId)
    .maybeSingle();
  if (used) return { ok: false, error: "ALREADY_USED" };

  const d = computeDiscount(promo, input.plan);
  if (d.final < MIN_FINAL_IDR || d.usdt.final < MIN_FINAL_USDT) return { ok: false, error: "TOO_LOW" };

  return {
    ok: true,
    quote: {
      codeId: promo.id,
      code: promo.code,
      idr: { original: d.original, discount: d.discount, final: d.final },
      usdt: d.usdt,
    },
  };
}

/** Catat pemakaian kode saat pembayaran selesai. Tidak melempar error. */
export async function redeemPromoForPayment(service: SupabaseClient, paymentId: string): Promise<void> {
  try {
    const { error } = await service.rpc("redeem_promo", { p_payment_id: String(paymentId) });
    if (error) console.error("[promo] redeem gagal:", error.message);
  } catch (err) {
    console.error("[promo] redeem gagal:", err);
  }
}
