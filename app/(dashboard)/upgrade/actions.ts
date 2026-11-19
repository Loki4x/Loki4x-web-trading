"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import type { Plan } from "@/lib/payment-constants";
import {
  checkPaymentStatusCore,
  createPoketoPaymentCore,
  fail,
  previewPromoCore,
  submitUsdtPaymentCore,
  submitVipRequestCore,
  type PromoPreview,
  type UpgradeCtx,
} from "@/lib/upgrade-core";

export type { PromoPreview };

// Logika pembayaran ada di lib/upgrade-core.ts, dipakai bersama oleh API aplikasi Android.
// Di produksi, Next.js menyamarkan pesan dari `throw new Error(...)` di server action menjadi teks umum,
// jadi aksi di bawah MENGEMBALIKAN { ok: false, message } untuk error yang bisa dijelaskan ke user.

async function upgradeCtx(): Promise<UpgradeCtx | ReturnType<typeof fail>> {
  const { t } = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(t("Sesi kamu berakhir. Silakan masuk lagi."));
  return { supabase, userId: user.id, email: user.email ?? null, t };
}

async function safely<T>(label: string, fn: () => Promise<T>): Promise<T | ReturnType<typeof fail>> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[upgrade/${label}]`, err);
    const { t } = await getT();
    return fail(t("Terjadi kesalahan."));
  }
}

export async function submitVipRequest(formData: FormData) {
  return safely("submitVipRequest", async () => {
    const ctx = await upgradeCtx();
    if ("ok" in ctx) return ctx;
    const res = await submitVipRequestCore(ctx, (k) => formData.get(k));
    if (res.ok) revalidatePath("/upgrade");
    return res;
  });
}

/** Cek kode promo untuk ditampilkan di modal pembayaran. Harga final selalu dihitung ulang saat order dibuat. */
export async function previewPromoCode({ plan, code }: { plan: Plan; code: string }): Promise<PromoPreview> {
  const ctx = await upgradeCtx();
  if ("ok" in ctx) return ctx;
  return previewPromoCore(ctx, plan, code);
}

/**
 * Bayar QRIS / Virtual Account lewat Poketo. Server membuat tagihan (invoice), lalu user membayar
 * di halaman Poketo (paymentUrl). Akses diaktifkan oleh webhook / pengecekan status.
 */
export async function createPoketoPayment(args: { plan: Plan; promoCode?: string | null }) {
  return safely("createPoketoPayment", async () => {
    const ctx = await upgradeCtx();
    if ("ok" in ctx) return ctx;
    return createPoketoPaymentCore(ctx, args.plan, args.promoCode);
  });
}

export async function checkInstantPaymentStatus(orderId: string) {
  const ctx = await upgradeCtx();
  if ("ok" in ctx) return null;
  return checkPaymentStatusCore(ctx, orderId);
}

export async function submitUsdtPayment(formData: FormData) {
  return safely("submitUsdtPayment", async () => {
    const ctx = await upgradeCtx();
    if ("ok" in ctx) return ctx;
    const res = await submitUsdtPaymentCore(ctx, (k) => formData.get(k), formData.get("slip") as File | null);
    if (res.ok) revalidatePath("/upgrade");
    return res;
  });
}
