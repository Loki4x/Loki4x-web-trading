"use server";


import { getT } from "@/lib/i18n/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type Plan } from "@/lib/payment-constants";
import { getAuditActor } from "@/lib/audit";
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
import {
  addNewsEventCore,
  approveUsdtPaymentCore,
  approveVipRequestCore,
  createPromoCodeCore,
  deleteNewsEventCore,
  deletePositioningCore,
  getUserStatsCore,
  rejectUsdtPaymentCore,
  rejectVipRequestCore,
  saveCalendarActualCore,
  setPromoActiveCore,
  toggleSuspendCore,
  updateUserTierCore,
  upsertPositioningCore,
} from "@/lib/admin-ops-core";
import {
  deleteLinkItemCore,
  reorderLinksCore,
  saveLinkItemCore,
  saveLinkProfileCore,
  setLinkActiveCore,
} from "@/lib/link-page-core";

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
  const res = await updateUserTierCore(await adminCtx(), userId, tier, vipExpiresAt);
  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return res;
}
export async function toggleSuspend(userId: string, suspend: boolean) {
  const res = await toggleSuspendCore(await adminCtx(), userId, suspend);
  if (!res.ok) throw new Error(res.message);
  revalidatePath("/admin/users");
}

export async function getUserStats(userId: string) {
  return getUserStatsCore(await adminCtx(), userId);
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

/** Simpan/hapus nilai Actual kalender ekonomi (menu Admin -> Actual Berita). value kosong = hapus. */
export async function saveCalendarActual(eventKey: string, value: string): Promise<ActionResult> {
  const res = await saveCalendarActualCore(await adminCtx(), eventKey, value);
  if (res.ok) {
    revalidatePath("/news");
    revalidatePath("/admin/calendar-actuals");
  }
  return res;
}

export async function createPromoCode(formData: FormData): Promise<ActionResult> {
  const res = await createPromoCodeCore(await adminCtx(), (k) => formData.get(k), formData.getAll("plans"));
  if (res.ok) revalidatePath("/admin/promo-codes");
  return res;
}

export async function setPromoActive(promoId: string, active: boolean): Promise<ActionResult> {
  const res = await setPromoActiveCore(await adminCtx(), promoId, active);
  if (res.ok) revalidatePath("/admin/promo-codes");
  return res;
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
  const res = await upsertPositioningCore(await adminCtx(), (k) => formData.get(k));
  revalidatePath("/admin/positioning");
  revalidatePath("/positioning");
  return res;
}

export async function deletePositioning(id: string) {
  await deletePositioningCore(await adminCtx(), id);
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
  const res = await addNewsEventCore(await adminCtx(), (k) => formData.get(k));
  revalidatePath("/admin/news");
  revalidatePath("/news");
  return res;
}

export async function deleteNewsEvent(id: string) {
  await deleteNewsEventCore(await adminCtx(), id);
  revalidatePath("/admin/news");
  revalidatePath("/news");
}

// Parameter kedua sengaja diabaikan: user_id diambil dari baris pengajuan di database.
export async function approveVipRequest(requestId: string, _clientUserId?: string) {
  const res = await approveVipRequestCore(await adminCtx(), requestId);
  revalidatePath("/admin/vip-requests");
  revalidatePath("/upgrade");
  return res;
}

export async function rejectVipRequest(requestId: string, reason?: string) {
  const res = await rejectVipRequestCore(await adminCtx(), requestId, reason);
  revalidatePath("/admin/vip-requests");
  revalidatePath("/upgrade");
  return res;
}

export async function sendAdminNotification(formData: FormData) {
  const res = await sendAdminNotificationCore(await adminCtx(), (k) => formData.get(k));
  return { message: res.message };
}

// Parameter ke-2 dan ke-3 sengaja diabaikan: user_id dan plan diambil dari baris pembayaran di database.
export async function approveUsdtPayment(paymentId: string, _clientUserId?: string, _clientPlan?: Plan) {
  const res = await approveUsdtPaymentCore(await adminCtx(), paymentId);
  revalidatePath("/admin/usdt-payments");
  revalidatePath("/upgrade");
  return res;
}

export async function rejectUsdtPayment(paymentId: string, reason?: string) {
  const res = await rejectUsdtPaymentCore(await adminCtx(), paymentId, reason);
  revalidatePath("/admin/usdt-payments");
  revalidatePath("/upgrade");
  return res;
}

// ---------------------------------------------------------------------------
// Halaman link (/links)
// ---------------------------------------------------------------------------

function revalidateLinks() {
  revalidatePath("/links");
  revalidatePath("/admin/links");
}

export async function saveLinkProfile(formData: FormData): Promise<ActionResult> {
  const res = await saveLinkProfileCore(await adminCtx(), (k) => formData.get(k));
  if (res.ok) revalidateLinks();
  return res;
}

export async function saveLinkItem(formData: FormData): Promise<ActionResult> {
  const res = await saveLinkItemCore(await adminCtx(), (k) => formData.get(k));
  if (res.ok) revalidateLinks();
  return res;
}

export async function setLinkActive(id: string, active: boolean): Promise<ActionResult> {
  const res = await setLinkActiveCore(await adminCtx(), id, active);
  if (res.ok) revalidateLinks();
  return res;
}

export async function deleteLinkItem(id: string): Promise<ActionResult> {
  const res = await deleteLinkItemCore(await adminCtx(), id);
  if (res.ok) revalidateLinks();
  return res;
}

export async function reorderLinks(ids: string[]): Promise<ActionResult> {
  const res = await reorderLinksCore(await adminCtx(), ids);
  if (res.ok) revalidateLinks();
  return res;
}
