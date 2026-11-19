"use server";


import { getT, getUserT } from "@/lib/i18n/server";
import { dateLocale } from "@/lib/i18n/dictionary";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifyUser } from "@/lib/notifications";
import { type Plan } from "@/lib/payment-constants";
import { computeGrant } from "@/lib/membership-grant";
import { logAudit, getAuditActor } from "@/lib/audit";
import { redeemPromoForPayment, normalizePromoCode, PROMO_CODE_PATTERN } from "@/lib/promo";
import { grantReferralReward } from "@/lib/referral";
import { createServiceClient } from "@/lib/supabase/service";
import {
  addAcademyVideoCore,
  addQuizQuestionCore,
  addSignalCore,
  addSignalUpdateCore,
  deleteAcademyVideoCore,
  deleteQuizQuestionCore,
  deleteSignalCore,
  sendAdminNotificationCore,
  updateSignalStatusCore,
  type AdminCtx,
} from "@/lib/admin-core";

async function assertIsAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) throw new Error("Not authorized");

  return supabase;
}

export async function updateUserTier(userId: string, tier: "FREE" | "VIP" | "MEMBERSHIP", vipExpiresAt: string | null) {
  const supabase = await assertIsAdmin();

  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("email, tier, vip_expires_at")
    .eq("id", userId)
    .single();

  await supabase
    .from("profiles")
    .update({
      tier,
      vip_expires_at: tier !== "FREE" ? vipExpiresAt : null,
    })
    .eq("id", userId);

  await logAudit(supabase, {
    actor: await getAuditActor(supabase),
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

  revalidatePath("/admin/users");
  revalidatePath("/admin");
}
export async function toggleSuspend(userId: string, suspend: boolean) {
  const supabase = await assertIsAdmin();

  // Jangan sampai admin mengunci dirinya sendiri.
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();
  if (suspend && currentUser?.id === userId) {
    throw new Error("Tidak bisa menangguhkan akun sendiri");
  }

  await supabase.from("profiles").update({ is_suspended: suspend }).eq("id", userId);

  await logAudit(supabase, {
    actor: await getAuditActor(supabase),
    action: suspend ? "USER_SUSPENDED" : "USER_UNSUSPENDED",
    targetUserId: userId,
  });

  // Flag di tabel profiles saja nggak cukup: sesi user yang sedang login tetap
  // valid. Ban di Supabase Auth menolak login baru & refresh token, jadi sesi
  // lamanya mati begitu access token-nya kedaluwarsa. Sementara itu, layout
  // dashboard mengecek is_suspended dan langsung menendangnya saat pindah halaman.
  const service = createServiceClient();
  const { error: banError } = await service.auth.admin.updateUserById(userId, {
    ban_duration: suspend ? "876000h" : "none",
  });
  if (banError) {
    console.error(`[admin] Gagal ${suspend ? "ban" : "unban"} user ${userId} di Supabase Auth:`, banError);
  }

  revalidatePath("/admin/users");
}

export async function getUserStats(userId: string) {
  const supabase = await assertIsAdmin();

  const { data: trades } = await supabase
    .from("trades")
    .select("id, symbol, side, pnl, status, trade_date")
    .eq("user_id", userId)
    .order("trade_date", { ascending: false })
    .limit(10);

  const allTrades = trades ?? [];
  const closed = allTrades.filter((t) => t.status === "CLOSED" && t.pnl !== null);
  const wins = closed.filter((t) => (t.pnl ?? 0) > 0).length;
  const winRate = closed.length > 0 ? (wins / closed.length) * 100 : 0;

  return {
    totalTrades: allTrades.length,
    winRate,
    recentTrades: allTrades.slice(0, 5),
  };
}

type ActionResult = { ok: boolean; message?: string };

/** Konteks admin untuk inti aksi di lib/admin-core.ts (dipakai bersama API admin aplikasi). */
async function adminCtx(): Promise<AdminCtx> {
  const supabase = await assertIsAdmin();
  const { t } = await getT();
  return { supabase, actor: await getAuditActor(supabase), t };
}

function revalidateSignals() {
  revalidatePath("/admin/signals");
  revalidatePath("/signals");
}

function revalidateAcademy() {
  revalidatePath("/admin/academy");
  revalidatePath("/academy/technical");
  revalidatePath("/academy/fundamental");
  revalidatePath("/academy/psychology");
}

export async function addSignal(formData: FormData): Promise<ActionResult> {
  const res = await addSignalCore(await adminCtx(), (k) => formData.get(k), formData.get("chart_image") as File | null);
  if (res.ok) revalidateSignals();
  return res;
}

export async function updateSignalStatus(
  signalId: string,
  status: string,
  currentPrice: number | null,
  resultPips: number | null,
  closedAtInput: string | null = null,
  extra: FormData | null = null
): Promise<ActionResult> {
  const res = await updateSignalStatusCore(
    await adminCtx(),
    signalId,
    status,
    currentPrice,
    resultPips,
    closedAtInput,
    (extra?.get("result_image") as File | null) ?? null
  );
  if (res.ok) revalidateSignals();
  return res;
}

/**
 * Simpan/hapus nilai Actual kalender ekonomi secara manual.
 * value kosong = hapus. Dipanggil dari menu Admin -> Actual Berita.
 */
export async function saveCalendarActual(eventKey: string, value: string): Promise<ActionResult> {
  const { t } = await getT();
  const supabase = await assertIsAdmin();

  const key = String(eventKey ?? "").trim();
  const actual = String(value ?? "").trim();
  if (!key || key.length > 250 || !/^\d{4}-\d{2}-\d{2}\|/.test(key)) return { ok: false, message: t("Terjadi kesalahan.") };
  if (actual.length > 40) return { ok: false, message: t("Nilai Actual terlalu panjang (maks 40 karakter).") };

  const actor = await getAuditActor(supabase);
  const { error } = actual
    ? await supabase
        .from("calendar_actuals")
        .upsert({ event_key: key, actual, updated_by: actor.id, updated_at: new Date().toISOString() })
    : await supabase.from("calendar_actuals").delete().eq("event_key", key);
  if (error) return { ok: false, message: t("Gagal menyimpan: {detail}", { detail: error.message }) };

  await logAudit(supabase, { actor, action: "CALENDAR_ACTUAL_SET", targetId: key, details: { actual: actual || null } });

  revalidatePath("/news");
  revalidatePath("/admin/calendar-actuals");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Kode promo (khusus admin)
// ---------------------------------------------------------------------------
const PROMO_PLANS = ["VIP", "MEMBERSHIP", "MEMBERSHIP_LIFETIME"];

function wibDate(value: FormDataEntryValue | null, endOfDay: boolean): Date | null {
  const raw = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const d = new Date(`${raw}T${endOfDay ? "23:59:59" : "00:00:00"}+07:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createPromoCode(formData: FormData): Promise<ActionResult> {
  const { t } = await getT();
  const supabase = await assertIsAdmin();

  const code = normalizePromoCode(formData.get("code"));
  const type = String(formData.get("type") ?? "");
  const value = Number(formData.get("value"));
  const maxUsesRaw = String(formData.get("max_uses") ?? "").trim();
  const maxUses = maxUsesRaw ? Number(maxUsesRaw) : null;
  const validFrom = wibDate(formData.get("valid_from"), false);
  const validUntil = wibDate(formData.get("valid_until"), true);
  const note = String(formData.get("note") ?? "").trim().slice(0, 200) || null;

  if (!PROMO_CODE_PATTERN.test(code)) {
    return { ok: false, message: t("Kode harus 3–32 karakter: huruf besar, angka, - atau _.") };
  }
  if (type !== "PERCENT" && type !== "FIXED_IDR") return { ok: false, message: t("Jenis diskon tidak valid.") };
  if (!Number.isFinite(value)) return { ok: false, message: t("Nilai diskon tidak valid.") };
  if (type === "PERCENT" && (value < 1 || value > 95)) {
    return { ok: false, message: t("Diskon persen harus antara 1 dan 95.") };
  }
  if (type === "FIXED_IDR" && (!Number.isInteger(value) || value < 1000 || value > 1_000_000)) {
    return { ok: false, message: t("Potongan nominal harus bilangan bulat antara Rp1.000 dan Rp1.000.000.") };
  }
  if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) {
    return { ok: false, message: t("Batas pemakaian harus bilangan bulat minimal 1.") };
  }
  if (validFrom && validUntil && validUntil < validFrom) {
    return { ok: false, message: t("Tanggal berakhir tidak boleh sebelum tanggal mulai.") };
  }

  const chosen = formData.getAll("plans").map(String).filter((p) => PROMO_PLANS.includes(p));
  const plans = chosen.length === 0 || chosen.length === PROMO_PLANS.length ? null : chosen;

  const actor = await getAuditActor(supabase);
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
      created_by: actor.id,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return { ok: false, message: t("Kode ini sudah ada.") };
    return { ok: false, message: t("Gagal menyimpan: {detail}", { detail: error.message }) };
  }

  await logAudit(supabase, {
    actor,
    action: "PROMO_CREATED",
    targetId: created?.id ?? null,
    details: { code, type, value, max_uses: maxUses, plans, valid_until: validUntil ? validUntil.toISOString() : null },
  });

  revalidatePath("/admin/promo-codes");
  return { ok: true };
}

export async function setPromoActive(promoId: string, active: boolean): Promise<ActionResult> {
  const { t } = await getT();
  const supabase = await assertIsAdmin();

  const { data, error } = await supabase
    .from("promo_codes")
    .update({ active: Boolean(active) })
    .eq("id", promoId)
    .select("code")
    .maybeSingle();
  if (error || !data) return { ok: false, message: t("Gagal menyimpan: {detail}", { detail: error?.message ?? "-" }) };

  await logAudit(supabase, {
    actor: await getAuditActor(supabase),
    action: "PROMO_TOGGLED",
    targetId: promoId,
    details: { code: data.code, active: Boolean(active) },
  });

  revalidatePath("/admin/promo-codes");
  return { ok: true };
}

export async function addSignalUpdate(formData: FormData): Promise<ActionResult> {
  const res = await addSignalUpdateCore(await adminCtx(), (k) => formData.get(k));
  if (res.ok) revalidateSignals();
  return res;
}

export async function deleteSignal(signalId: string) {
  await deleteSignalCore(await adminCtx(), signalId);
  revalidateSignals();
}

export async function upsertPositioning(formData: FormData) {
  const supabase = await assertIsAdmin();

  const longPercent = Number(formData.get("long_percent"));

  await supabase.from("positioning").upsert(
    {
      symbol: String(formData.get("symbol")).toUpperCase(),
      long_percent: longPercent,
      short_percent: 100 - longPercent,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "symbol" }
  );

  revalidatePath("/admin/positioning");
  revalidatePath("/positioning");
}

export async function deletePositioning(id: string) {
  const supabase = await assertIsAdmin();
  await supabase.from("positioning").delete().eq("id", id);
  revalidatePath("/admin/positioning");
  revalidatePath("/positioning");
}

export async function addAcademyVideo(formData: FormData) {
  const res = await addAcademyVideoCore(await adminCtx(), (k) => formData.get(k));
  if (res.ok) revalidateAcademy();
  return res;
}

export async function deleteAcademyVideo(id: string) {
  await deleteAcademyVideoCore(await adminCtx(), id);
  revalidateAcademy();
}

/** Tambah soal kuis Akademi. Opsi kosong dibuang; jawaban benar = indeks di antara opsi yang terisi. */
export async function addQuizQuestion(formData: FormData) {
  const res = await addQuizQuestionCore(await adminCtx(), {
    category: formData.get("category"),
    question: formData.get("question"),
    options: formData.getAll("options"),
    correctIndex: formData.get("correct_index"),
    explanation: formData.get("explanation"),
  });
  if (res.success) revalidatePath("/admin/academy");
  return res;
}

export async function deleteQuizQuestion(id: string) {
  await deleteQuizQuestionCore(await adminCtx(), id);
  revalidatePath("/admin/academy");
}

export async function addNewsEvent(formData: FormData) {
  const supabase = await assertIsAdmin();

  await supabase.from("news").insert({
    event_title: String(formData.get("event_title")),
    currency: String(formData.get("currency")).toUpperCase(),
    impact_level: String(formData.get("impact_level")),
    release_time: String(formData.get("release_time")),
    actual: String(formData.get("actual") ?? "") || null,
    forecast: String(formData.get("forecast") ?? "") || null,
    previous: String(formData.get("previous") ?? "") || null,
  });

  revalidatePath("/admin/news");
  revalidatePath("/news");
}

export async function deleteNewsEvent(id: string) {
  const supabase = await assertIsAdmin();
  await supabase.from("news").delete().eq("id", id);
  revalidatePath("/admin/news");
  revalidatePath("/news");
}

// Parameter kedua sengaja diabaikan: user_id diambil dari baris pengajuan di database,
// bukan dari client, supaya tidak bisa dimanipulasi.
export async function approveVipRequest(requestId: string, _clientUserId?: string) {
  const { t } = await getT();
  const supabase = await assertIsAdmin();

  // "Klaim" pengajuan secara atomik: hanya yang masih PENDING yang bisa di-approve,
  // jadi klik ganda / dua admin sekaligus tidak memproses dua kali.
  const { data: request } = await supabase
    .from("vip_ib_requests")
    .update({ status: "APPROVED", reviewed_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("status", "PENDING")
    .select("id, user_id")
    .maybeSingle();

  if (!request) {
    return { ok: false, message: t("Pengajuan sudah diproses atau tidak ditemukan.") };
  }
  const userId = request.user_id as string;

  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("email, tier, vip_expires_at")
    .eq("id", userId)
    .single();

  // Persetujuan IB = VIP tanpa batas waktu, tapi jangan menurunkan user yang sedang
  // Membership aktif.
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
    actor: await getAuditActor(supabase),
    action: "VIP_REQUEST_APPROVED",
    targetUserId: userId,
    targetId: requestId,
    details: {
      target_email: targetProfile?.email ?? null,
      from_tier: targetProfile?.tier ?? null,
      kept_membership: hasActiveMembership,
    },
  });

  await grantReferralReward(userId);

  revalidatePath("/admin/vip-requests");
  revalidatePath("/upgrade");
  return { ok: true };
}

export async function rejectVipRequest(requestId: string) {
  const supabase = await assertIsAdmin();

  const { data: rejected } = await supabase
    .from("vip_ib_requests")
    .update({ status: "REJECTED", reviewed_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("status", "PENDING")
    .select("id, user_id")
    .maybeSingle();

  if (rejected) {
    await logAudit(supabase, {
      actor: await getAuditActor(supabase),
      action: "VIP_REQUEST_REJECTED",
      targetUserId: rejected.user_id as string,
      targetId: requestId,
    });
  }

  revalidatePath("/admin/vip-requests");
}

export async function sendAdminNotification(formData: FormData) {
  const res = await sendAdminNotificationCore(await adminCtx(), (k) => formData.get(k));
  return { message: res.message };
}

// Parameter ke-2 dan ke-3 sengaja diabaikan: user_id dan plan diambil dari baris
// pembayaran di database, bukan dari client.
export async function approveUsdtPayment(paymentId: string, _clientUserId?: string, _clientPlan?: Plan) {
  const { t } = await getT();
  const supabase = await assertIsAdmin();

  // Klaim atomik: hanya pembayaran USDT yang masih PENDING yang bisa di-approve.
  // Klik ganda / dua admin sekaligus / approve pembayaran yang sudah ditolak -> ditolak di sini.
  const { data: payment } = await supabase
    .from("payments")
    .update({ status: "COMPLETED", completed_at: new Date().toISOString() })
    .eq("id", paymentId)
    .eq("currency", "USDT")
    .eq("status", "PENDING")
    .select("id, user_id, plan, promo_code")
    .maybeSingle();

  if (!payment) {
    return { ok: false, message: t("Pembayaran sudah diproses atau tidak ditemukan.") };
  }

  const userId = payment.user_id as string;
  const plan = payment.plan as Plan;

  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("email, tier, vip_expires_at")
    .eq("id", userId)
    .single();

  const grant = computeGrant(
    { tier: targetProfile?.tier ?? null, vip_expires_at: targetProfile?.vip_expires_at ?? null },
    plan
  );
  const tier = grant.tier as string;
  const newExpiry = grant.vip_expires_at ? new Date(grant.vip_expires_at) : null;

  const { error: upgradeError } = await supabase
    .from("profiles")
    .update({ tier: grant.tier, vip_expires_at: grant.vip_expires_at })
    .eq("id", userId);

  if (upgradeError) {
    // Gagal memberi akses -> kembalikan ke PENDING supaya bisa diproses ulang.
    await supabase.from("payments").update({ status: "PENDING", completed_at: null }).eq("id", paymentId);
    return { ok: false, message: t("Gagal menyimpan: {detail}", { detail: upgradeError.message }) };
  }

  const { t: tu, locale: userLocale } = await getUserT(supabase, userId);
  const expiryLabel = newExpiry
    ? tu("sampai {date}", {
        date: newExpiry.toLocaleDateString(dateLocale(userLocale), { day: "numeric", month: "long", year: "numeric" }),
      })
    : tu("selamanya (lifetime)");

  await notifyUser({
    userId,
    email: targetProfile?.email ?? null,
    type: "TIER_UPGRADE",
    title: tu("Pembayaran {plan} berhasil dikonfirmasi", { plan }),
    message: tu("Pembayaran USDT kamu sudah diverifikasi admin. Akun kamu sekarang aktif sebagai {tier} {expiry}.", { tier, expiry: expiryLabel }),
  });

  await logAudit(supabase, {
    actor: await getAuditActor(supabase),
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

  revalidatePath("/admin/usdt-payments");
  revalidatePath("/upgrade");
  return { ok: true };
}

export async function rejectUsdtPayment(paymentId: string) {
  const supabase = await assertIsAdmin();
  const { data: rejected } = await supabase
    .from("payments")
    .update({ status: "FAILED" })
    .eq("id", paymentId)
    .eq("currency", "USDT")
    .eq("status", "PENDING")
    .select("id, user_id, plan")
    .maybeSingle();

  if (rejected) {
    await logAudit(supabase, {
      actor: await getAuditActor(supabase),
      action: "USDT_REJECTED",
      targetUserId: rejected.user_id as string,
      targetId: paymentId,
      details: { plan: rejected.plan },
    });
  }
  revalidatePath("/admin/usdt-payments");
}
