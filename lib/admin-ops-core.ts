import { getUserT } from "@/lib/i18n/server";
import { dateLocale } from "@/lib/i18n/dictionary";
import { notifyUser } from "@/lib/notifications";
import { type Plan } from "@/lib/payment-constants";
import { computeGrant } from "@/lib/membership-grant";
import { logAudit } from "@/lib/audit";
import { redeemPromoForPayment, normalizePromoCode, PROMO_CODE_PATTERN } from "@/lib/promo";
import { grantReferralReward } from "@/lib/referral";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionResult, AdminCtx } from "@/lib/admin-core";

/**
 * Inti aksi admin lainnya (user, pengajuan VIP, pembayaran USDT, kode promo, positioning,
 * berita, Actual kalender) yang dipakai bersama oleh server action web (app/admin/actions.ts)
 * dan API admin aplikasi Android (app/api/mobile/admin/...).
 * Pemanggil WAJIB sudah memastikan user adalah admin.
 */

type Getter = (key: string) => unknown;
const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));

export type UserTier = "FREE" | "VIP" | "MEMBERSHIP";

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

export async function updateUserTierCore(ctx: AdminCtx, userId: string, tier: UserTier, vipExpiresAt: string | null): Promise<ActionResult> {
  const { supabase, t } = ctx;
  if (tier !== "FREE" && tier !== "VIP" && tier !== "MEMBERSHIP") return { ok: false, message: t("Terjadi kesalahan.") };
  if (vipExpiresAt !== null && Number.isNaN(new Date(vipExpiresAt).getTime())) {
    return { ok: false, message: t("Tanggal tidak valid.") };
  }

  const { data: targetProfile } = await supabase.from("profiles").select("email, tier, vip_expires_at").eq("id", userId).single();

  const { error } = await supabase
    .from("profiles")
    .update({ tier, vip_expires_at: tier !== "FREE" ? vipExpiresAt : null })
    .eq("id", userId);
  if (error) return { ok: false, message: t("Gagal menyimpan: {detail}", { detail: error.message }) };

  await logAudit(supabase, {
    actor: ctx.actor,
    action: "TIER_CHANGED",
    targetUserId: userId,
    details: {
      target_email: targetProfile?.email ?? null,
      from_tier: targetProfile?.tier ?? null,
      to_tier: tier,
      from_expires_at: targetProfile?.vip_expires_at ?? null,
      to_expires_at: tier !== "FREE" ? vipExpiresAt : null,
    },
  });

  if ((tier === "VIP" || tier === "MEMBERSHIP") && targetProfile?.tier !== tier) {
    const { t: tu } = await getUserT(supabase, userId);
    await notifyUser({
      userId,
      email: targetProfile?.email ?? null,
      type: "TIER_UPGRADE",
      title: tu("Selamat! Akun kamu sekarang {tier}", { tier }),
      message: tu("Akun kamu berhasil di-upgrade ke tier {tier}. Nikmati semua fitur yang terbuka sekarang!", { tier }),
    });
  }
  return { ok: true };
}

export async function toggleSuspendCore(ctx: AdminCtx, userId: string, suspend: boolean): Promise<ActionResult> {
  const { supabase, t } = ctx;
  // Jangan sampai admin mengunci dirinya sendiri.
  if (suspend && ctx.actor.id === userId) return { ok: false, message: t("Tidak bisa menangguhkan akun sendiri") };

  const { error } = await supabase.from("profiles").update({ is_suspended: suspend }).eq("id", userId);
  if (error) return { ok: false, message: t("Gagal menyimpan: {detail}", { detail: error.message }) };

  await logAudit(supabase, { actor: ctx.actor, action: suspend ? "USER_SUSPENDED" : "USER_UNSUSPENDED", targetUserId: userId });

  // Flag di tabel profiles saja nggak cukup: sesi user yang sedang login tetap
  // valid. Ban di Supabase Auth menolak login baru & refresh token, jadi sesi
  // lamanya mati begitu access token-nya kedaluwarsa. Sementara itu, layout
  // dashboard mengecek is_suspended dan langsung menendangnya saat pindah halaman.
  const service = createServiceClient();
  const { error: banError } = await service.auth.admin.updateUserById(userId, { ban_duration: suspend ? "876000h" : "none" });
  if (banError) console.error(`[admin] Gagal ${suspend ? "ban" : "unban"} user ${userId} di Supabase Auth:`, banError);
  return { ok: true };
}

export async function getUserStatsCore(ctx: AdminCtx, userId: string) {
  const { data: trades } = await ctx.supabase
    .from("trades")
    .select("id, symbol, side, pnl, status, trade_date")
    .eq("user_id", userId)
    .order("trade_date", { ascending: false })
    .limit(10);

  const allTrades = trades ?? [];
  const closed = allTrades.filter((t) => t.status === "CLOSED" && t.pnl !== null);
  const wins = closed.filter((t) => (t.pnl ?? 0) > 0).length;
  const winRate = closed.length > 0 ? (wins / closed.length) * 100 : 0;

  return { totalTrades: allTrades.length, winRate, recentTrades: allTrades.slice(0, 5) };
}

// ---------------------------------------------------------------------------
// Actual kalender ekonomi
// ---------------------------------------------------------------------------

/** Simpan/hapus nilai Actual kalender ekonomi secara manual. value kosong = hapus. */
export async function saveCalendarActualCore(ctx: AdminCtx, eventKey: unknown, value: unknown): Promise<ActionResult> {
  const { supabase, t } = ctx;
  const key = str(eventKey).trim();
  const actual = str(value).trim();
  if (!key || key.length > 250 || !/^\d{4}-\d{2}-\d{2}\|/.test(key)) return { ok: false, message: t("Terjadi kesalahan.") };
  if (actual.length > 40) return { ok: false, message: t("Nilai Actual terlalu panjang (maks 40 karakter).") };

  const { error } = actual
    ? await supabase
        .from("calendar_actuals")
        .upsert({ event_key: key, actual, updated_by: ctx.actor.id, updated_at: new Date().toISOString() })
    : await supabase.from("calendar_actuals").delete().eq("event_key", key);
  if (error) return { ok: false, message: t("Gagal menyimpan: {detail}", { detail: error.message }) };

  await logAudit(supabase, { actor: ctx.actor, action: "CALENDAR_ACTUAL_SET", targetId: key, details: { actual: actual || null } });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Kode promo
// ---------------------------------------------------------------------------

export const PROMO_PLANS = ["VIP", "MEMBERSHIP", "MEMBERSHIP_LIFETIME"];

function wibDate(value: unknown, endOfDay: boolean): Date | null {
  const raw = str(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const d = new Date(`${raw}T${endOfDay ? "23:59:59" : "00:00:00"}+07:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** `plans` = daftar paket yang dipilih (kosong / semua = berlaku untuk semua paket). */
export async function createPromoCodeCore(ctx: AdminCtx, get: Getter, plansInput: unknown[]): Promise<ActionResult> {
  const { supabase, t } = ctx;

  const code = normalizePromoCode(get("code") as FormDataEntryValue | null);
  const type = str(get("type"));
  const value = Number(get("value"));
  const maxUsesRaw = str(get("max_uses")).trim();
  const maxUses = maxUsesRaw ? Number(maxUsesRaw) : null;
  const validFrom = wibDate(get("valid_from"), false);
  const validUntil = wibDate(get("valid_until"), true);
  const note = str(get("note")).trim().slice(0, 200) || null;

  if (!PROMO_CODE_PATTERN.test(code)) return { ok: false, message: t("Kode harus 3–32 karakter: huruf besar, angka, - atau _.") };
  if (type !== "PERCENT" && type !== "FIXED_IDR") return { ok: false, message: t("Jenis diskon tidak valid.") };
  if (!Number.isFinite(value)) return { ok: false, message: t("Nilai diskon tidak valid.") };
  if (type === "PERCENT" && (value < 1 || value > 95)) return { ok: false, message: t("Diskon persen harus antara 1 dan 95.") };
  if (type === "FIXED_IDR" && (!Number.isInteger(value) || value < 1000 || value > 1_000_000)) {
    return { ok: false, message: t("Potongan nominal harus bilangan bulat antara Rp1.000 dan Rp1.000.000.") };
  }
  if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) {
    return { ok: false, message: t("Batas pemakaian harus bilangan bulat minimal 1.") };
  }
  if (validFrom && validUntil && validUntil < validFrom) {
    return { ok: false, message: t("Tanggal berakhir tidak boleh sebelum tanggal mulai.") };
  }

  const chosen = Array.from(new Set(plansInput.map(String).filter((p) => PROMO_PLANS.includes(p))));
  const plans = chosen.length === 0 || chosen.length === PROMO_PLANS.length ? null : chosen;

  const { data: created, error } = await supabase
    .from("promo_codes")
    .insert({
      code,
      type,
      value,
      max_uses: maxUses,
      valid_from: validFrom ? validFrom.toISOString() : null,
      valid_until: validUntil ? validUntil.toISOString() : null,
      plans,
      note,
      created_by: ctx.actor.id,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return { ok: false, message: t("Kode ini sudah ada.") };
    return { ok: false, message: t("Gagal menyimpan: {detail}", { detail: error.message }) };
  }

  await logAudit(supabase, {
    actor: ctx.actor,
    action: "PROMO_CREATED",
    targetId: created?.id ?? null,
    details: { code, type, value, max_uses: maxUses, plans, valid_until: validUntil ? validUntil.toISOString() : null },
  });
  return { ok: true };
}

export async function setPromoActiveCore(ctx: AdminCtx, promoId: string, active: boolean): Promise<ActionResult> {
  const { supabase, t } = ctx;
  const { data, error } = await supabase.from("promo_codes").update({ active: Boolean(active) }).eq("id", promoId).select("code").maybeSingle();
  if (error || !data) return { ok: false, message: t("Gagal menyimpan: {detail}", { detail: error?.message ?? "-" }) };

  await logAudit(supabase, { actor: ctx.actor, action: "PROMO_TOGGLED", targetId: promoId, details: { code: data.code, active: Boolean(active) } });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Positioning & berita ekonomi
// ---------------------------------------------------------------------------

export async function upsertPositioningCore(ctx: AdminCtx, get: Getter): Promise<ActionResult> {
  const { t } = ctx;
  const symbol = str(get("symbol")).trim().toUpperCase();
  const longPercent = Number(get("long_percent"));
  if (!symbol || symbol.length > 20) return { ok: false, message: t("Simbol wajib diisi.") };
  if (!Number.isFinite(longPercent) || longPercent < 0 || longPercent > 100) return { ok: false, message: t("Long % harus antara 0 dan 100.") };

  const { error } = await ctx.supabase.from("positioning").upsert(
    { symbol, long_percent: longPercent, short_percent: 100 - longPercent, updated_at: new Date().toISOString() },
    { onConflict: "symbol" }
  );
  if (error) return { ok: false, message: t("Gagal menyimpan: {detail}", { detail: error.message }) };
  return { ok: true };
}

export async function deletePositioningCore(ctx: AdminCtx, id: string): Promise<ActionResult> {
  const { error } = await ctx.supabase.from("positioning").delete().eq("id", id);
  if (error) return { ok: false, message: ctx.t("Gagal menyimpan: {detail}", { detail: error.message }) };
  return { ok: true };
}

export async function addNewsEventCore(ctx: AdminCtx, get: Getter): Promise<ActionResult> {
  const { t } = ctx;
  const title = str(get("event_title")).trim();
  const currency = str(get("currency")).trim().toUpperCase();
  const impact = str(get("impact_level"));
  const release = str(get("release_time")).trim();
  if (!title || !currency || !release) return { ok: false, message: t("Lengkapi semua kolom wajib.") };
  if (Number.isNaN(new Date(release).getTime())) return { ok: false, message: t("Tanggal tidak valid.") };

  const { error } = await ctx.supabase.from("news").insert({
    event_title: title,
    currency,
    impact_level: impact,
    release_time: release,
    actual: str(get("actual")) || null,
    forecast: str(get("forecast")) || null,
    previous: str(get("previous")) || null,
  });
  if (error) return { ok: false, message: t("Gagal menyimpan: {detail}", { detail: error.message }) };
  return { ok: true };
}

export async function deleteNewsEventCore(ctx: AdminCtx, id: string): Promise<ActionResult> {
  const { error } = await ctx.supabase.from("news").delete().eq("id", id);
  if (error) return { ok: false, message: ctx.t("Gagal menyimpan: {detail}", { detail: error.message }) };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Pengajuan VIP via IB
// ---------------------------------------------------------------------------

/** user_id diambil dari baris pengajuan di database, bukan dari client, supaya tidak bisa dimanipulasi. */
export async function approveVipRequestCore(ctx: AdminCtx, requestId: string): Promise<ActionResult> {
  const { supabase, t } = ctx;

  // "Klaim" pengajuan secara atomik: hanya yang masih PENDING yang bisa di-approve,
  // jadi klik ganda / dua admin sekaligus tidak memproses dua kali.
  const { data: request } = await supabase
    .from("vip_ib_requests")
    .update({ status: "APPROVED", reviewed_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("status", "PENDING")
    .select("id, user_id")
    .maybeSingle();
  if (!request) return { ok: false, message: t("Pengajuan sudah diproses atau tidak ditemukan.") };
  const userId = request.user_id as string;

  const { data: targetProfile } = await supabase.from("profiles").select("email, tier, vip_expires_at").eq("id", userId).single();

  // Persetujuan IB = VIP tanpa batas waktu, tapi jangan menurunkan user yang sedang Membership aktif.
  const expiry = targetProfile?.vip_expires_at ? new Date(targetProfile.vip_expires_at) : null;
  const hasActiveMembership = targetProfile?.tier === "MEMBERSHIP" && (expiry === null || expiry > new Date());

  if (!hasActiveMembership) {
    const { error } = await supabase.from("profiles").update({ tier: "VIP", vip_expires_at: null }).eq("id", userId);
    if (error) {
      // Gagal memberi akses -> kembalikan ke PENDING supaya bisa dicoba lagi.
      await supabase.from("vip_ib_requests").update({ status: "PENDING", reviewed_at: null }).eq("id", requestId);
      return { ok: false, message: t("Gagal menyimpan: {detail}", { detail: error.message }) };
    }
  }

  const { t: tu } = await getUserT(supabase, userId);
  await notifyUser({
    userId,
    email: targetProfile?.email ?? null,
    type: "TIER_UPGRADE",
    title: tu("Selamat! Akun kamu sekarang VIP"),
    message: tu("Pengajuan upgrade VIP kamu disetujui. Nikmati Signals & Positioning sekarang!"),
  });

  await logAudit(supabase, {
    actor: ctx.actor,
    action: "VIP_REQUEST_APPROVED",
    targetUserId: userId,
    targetId: requestId,
    details: { target_email: targetProfile?.email ?? null, from_tier: targetProfile?.tier ?? null, kept_membership: hasActiveMembership },
  });

  await grantReferralReward(userId);
  return { ok: true };
}

export async function rejectVipRequestCore(ctx: AdminCtx, requestId: string): Promise<ActionResult> {
  const { data: rejected } = await ctx.supabase
    .from("vip_ib_requests")
    .update({ status: "REJECTED", reviewed_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("status", "PENDING")
    .select("id, user_id")
    .maybeSingle();
  if (!rejected) return { ok: false, message: ctx.t("Pengajuan sudah diproses atau tidak ditemukan.") };

  await logAudit(ctx.supabase, { actor: ctx.actor, action: "VIP_REQUEST_REJECTED", targetUserId: rejected.user_id as string, targetId: requestId });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Pembayaran USDT (verifikasi manual)
// ---------------------------------------------------------------------------

/** user_id dan plan diambil dari baris pembayaran di database, bukan dari client. */
export async function approveUsdtPaymentCore(ctx: AdminCtx, paymentId: string): Promise<ActionResult> {
  const { supabase, t } = ctx;

  // Klaim atomik: hanya pembayaran USDT yang masih PENDING yang bisa di-approve.
  const { data: payment } = await supabase
    .from("payments")
    .update({ status: "COMPLETED", completed_at: new Date().toISOString() })
    .eq("id", paymentId)
    .eq("currency", "USDT")
    .eq("status", "PENDING")
    .select("id, user_id, plan, promo_code")
    .maybeSingle();
  if (!payment) return { ok: false, message: t("Pembayaran sudah diproses atau tidak ditemukan.") };

  const userId = payment.user_id as string;
  const plan = payment.plan as Plan;

  const { data: targetProfile } = await supabase.from("profiles").select("email, tier, vip_expires_at").eq("id", userId).single();

  const grant = computeGrant({ tier: targetProfile?.tier ?? null, vip_expires_at: targetProfile?.vip_expires_at ?? null }, plan);
  const tier = grant.tier as string;
  const newExpiry = grant.vip_expires_at ? new Date(grant.vip_expires_at) : null;

  const { error: upgradeError } = await supabase.from("profiles").update({ tier: grant.tier, vip_expires_at: grant.vip_expires_at }).eq("id", userId);
  if (upgradeError) {
    // Gagal memberi akses -> kembalikan ke PENDING supaya bisa diproses ulang.
    await supabase.from("payments").update({ status: "PENDING", completed_at: null }).eq("id", paymentId);
    return { ok: false, message: t("Gagal menyimpan: {detail}", { detail: upgradeError.message }) };
  }

  const { t: tu, locale: userLocale } = await getUserT(supabase, userId);
  const expiryLabel = newExpiry
    ? tu("sampai {date}", { date: newExpiry.toLocaleDateString(dateLocale(userLocale), { day: "numeric", month: "long", year: "numeric" }) })
    : tu("selamanya (lifetime)");

  await notifyUser({
    userId,
    email: targetProfile?.email ?? null,
    type: "TIER_UPGRADE",
    title: tu("Pembayaran {plan} berhasil dikonfirmasi", { plan }),
    message: tu("Pembayaran USDT kamu sudah diverifikasi admin. Akun kamu sekarang aktif sebagai {tier} {expiry}.", { tier, expiry: expiryLabel }),
  });

  await logAudit(supabase, {
    actor: ctx.actor,
    action: "USDT_APPROVED",
    targetUserId: userId,
    targetId: paymentId,
    details: {
      target_email: targetProfile?.email ?? null,
      plan,
      from_tier: targetProfile?.tier ?? null,
      to_tier: grant.tier,
      from_expires_at: targetProfile?.vip_expires_at ?? null,
      to_expires_at: grant.vip_expires_at,
      promo_code: (payment as { promo_code?: string | null }).promo_code ?? null,
    },
  });

  // Catat pemakaian kode promo & beri hadiah ke pengundang (tidak pernah melempar error).
  await redeemPromoForPayment(createServiceClient(), String(payment.id));
  await grantReferralReward(userId);
  return { ok: true };
}

export async function rejectUsdtPaymentCore(ctx: AdminCtx, paymentId: string): Promise<ActionResult> {
  const { data: rejected } = await ctx.supabase
    .from("payments")
    .update({ status: "FAILED" })
    .eq("id", paymentId)
    .eq("currency", "USDT")
    .eq("status", "PENDING")
    .select("id, user_id, plan")
    .maybeSingle();
  if (!rejected) return { ok: false, message: ctx.t("Pembayaran sudah diproses atau tidak ditemukan.") };

  await logAudit(ctx.supabase, {
    actor: ctx.actor,
    action: "USDT_REJECTED",
    targetUserId: rejected.user_id as string,
    targetId: paymentId,
    details: { plan: rejected.plan },
  });
  return { ok: true };
}
