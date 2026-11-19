import type { SupabaseClient } from "@supabase/supabase-js";
import { SYMBOL_RE } from "@/lib/validation";
import { notifyUser, notifyAllUsers } from "@/lib/notifications";
import { logAudit, type AuditActor } from "@/lib/audit";
import { sendSignalNotifications } from "@/lib/signal-notify";
import { uploadToR2 } from "@/lib/r2";

/**
 * Inti aksi admin (sinyal, video & kuis Akademi, pengumuman) yang dipakai bersama oleh server action
 * web (app/admin/actions.ts) dan API admin aplikasi Android (app/api/mobile/admin/...).
 * Pemanggil WAJIB sudah memastikan user adalah admin sebelum memanggil fungsi di sini.
 */

type T = (key: string, vars?: Record<string, string | number>) => string;
type Getter = (key: string) => unknown;

export interface AdminCtx {
  /** Klien Supabase milik admin yang login (RLS admin). */
  supabase: SupabaseClient;
  actor: AuditActor;
  t: T;
}

const VIDEO_CATEGORIES = ["TECHNICAL", "FUNDAMENTAL", "PSYCHOLOGY"];
const text = (v: unknown) => (v === null || v === undefined ? "" : String(v));

export type ActionResult = { ok: boolean; message?: string };

// Email notifikasi hanya dikirim untuk kejadian yang baru terjadi (bukan input data lama).
const FRESH_WINDOW_MS = 30 * 60 * 1000;

export const TERMINAL_SIGNAL_STATUSES = ["TP", "SL", "PARTIAL", "CANCEL", "MISS"];
export const ALL_SIGNAL_STATUSES = ["OPEN", "HIT_ENTRY", ...TERMINAL_SIGNAL_STATUSES];
const RESULT_SIGNAL_STATUSES = ["TP", "SL", "PARTIAL"];
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

/**
 * <input type="datetime-local"> mengirim "2026-09-15T14:30" tanpa zona waktu,
 * sedangkan server (Vercel) berjalan di UTC. Aplikasi ini untuk WIB (UTC+7),
 * jadi nilainya diartikan sebagai WIB. Tanpa ini jam sinyal bergeser 7 jam.
 * Return null kalau kosong; melempar error kalau formatnya salah.
 */
function parseWibDateTime(raw: unknown): Date | null {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    throw new Error("Format tanggal tidak valid.");
  }
  const date = new Date(`${value}:00+07:00`);
  if (Number.isNaN(date.getTime())) throw new Error("Tanggal tidak valid.");
  return date;
}

function optionalNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined || String(raw).trim() === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error("Ada angka yang tidak valid.");
  return n;
}

function failure(err: unknown, t: (key: string) => string): ActionResult {
  return { ok: false, message: t(err instanceof Error ? err.message : "Terjadi kesalahan.") };
}

export async function addSignalCore(ctx: AdminCtx, get: Getter, chartImageFile: File | null): Promise<ActionResult> {
  const { t, supabase } = ctx;

  try {
    const symbol = String(get("symbol") ?? "").trim().toUpperCase();
    if (!SYMBOL_RE.test(symbol)) {
      throw new Error("Symbol tidak valid (huruf/angka, maksimal 20 karakter)");
    }
    const side = String(get("side") ?? "");
    const status = String(get("status") ?? "OPEN");
    const entryPrice = optionalNumber(get("entry_price"));
    let takeProfit = optionalNumber(get("take_profit"));
    const stopLoss = optionalNumber(get("stop_loss"));
    const riskPercent = optionalNumber(get("risk_percent")) ?? 0.5;
    const signalType = String(get("signal_type") ?? "REGULAR") === "NEWS" ? "NEWS" : "REGULAR";

    if (!symbol) return { ok: false, message: t("Symbol wajib diisi.") };
    if (side !== "BUY" && side !== "SELL") return { ok: false, message: t("Side harus BUY atau SELL.") };
    if (entryPrice === null || entryPrice <= 0) return { ok: false, message: t("Entry price tidak valid.") };
    if (!ALL_SIGNAL_STATUSES.includes(status)) return { ok: false, message: t("Status tidak valid.") };

    // Tanggal sinyal: kosong = sekarang (perilaku lama). Isi untuk memasukkan sinyal lama.
    const postedAt = parseWibDateTime(get("posted_at")) ?? new Date();
    if (postedAt.getTime() > Date.now() + FUTURE_TOLERANCE_MS) {
      return { ok: false, message: t("Tanggal sinyal tidak boleh di masa depan.") };
    }

    const isTerminal = TERMINAL_SIGNAL_STATUSES.includes(status);
    let closedAt: Date | null = null;
    let currentPrice: number | null = null;
    let resultPips: number | null = null;

    if (isTerminal) {
      // Tanggal ditutup kosong = sama dengan tanggal sinyal (umumnya untuk sinyal lama).
      closedAt = parseWibDateTime(get("closed_at")) ?? postedAt;
      if (closedAt.getTime() > Date.now() + FUTURE_TOLERANCE_MS) {
        return { ok: false, message: t("Tanggal ditutup tidak boleh di masa depan.") };
      }
      if (closedAt.getTime() < postedAt.getTime()) {
        return { ok: false, message: t("Tanggal ditutup tidak boleh sebelum tanggal sinyal.") };
      }
    }

    if (RESULT_SIGNAL_STATUSES.includes(status)) {
      // Harga penutupan kosong: TP memakai Take Profit, SL memakai Stop Loss.
      let closing = optionalNumber(get("closing_price"));
      if (closing === null) closing = status === "TP" ? takeProfit : status === "SL" ? stopLoss : null;
      if (closing === null) {
        return {
          ok: false,
          message:
            status === "PARTIAL"
              ? t("Harga penutupan wajib diisi untuk status PARTIAL.")
              : t("Isi harga penutupan, atau isi {level} di atas.", { level: status === "TP" ? "Take Profit" : "Stop Loss" }),
        };
      }
      currentPrice = closing;
      resultPips = optionalNumber(get("result_pips")) ?? 0;
      // Sama seperti updateSignalStatus: kalau TP, harga penutupan jadi nilai Take Profit.
      if (status === "TP") takeProfit = closing;
    }

    const chartImageUrl = await uploadToR2(chartImageFile, `signals/${symbol}-${Date.now()}`);

    const { data: created, error } = await supabase
      .from("signals")
      .insert({
      symbol,
      side,
      status,
      entry_price: entryPrice,
      take_profit: takeProfit,
      stop_loss: stopLoss,
      current_price: currentPrice,
      current_price_at: currentPrice !== null && closedAt ? closedAt.toISOString() : null,
      result_pips: resultPips,
      risk_percent: riskPercent,
      signal_type: signalType,
      notes: String(get("notes") ?? "") || null,
      chart_image_url: chartImageUrl,
      posted_at: postedAt.toISOString(),
      closed_at: closedAt ? closedAt.toISOString() : null,
      })
      .select("id")
      .single();
    if (error) return { ok: false, message: t("Gagal menyimpan: {detail}", { detail: error.message }) };

    await logAudit(supabase, {
      actor: ctx.actor,
      action: "SIGNAL_CREATED",
      targetId: created?.id ?? null,
      details: { symbol, side, status, signal_type: signalType, entry_price: entryPrice, take_profit: takeProfit, stop_loss: stopLoss },
    });

    // Email hanya untuk sinyal BARU yang masih berjalan (diposting dalam 30 menit terakhir).
    // Sinyal lama / riwayat yang diinput mundur tidak mengirim email.
    if (!isTerminal && Date.now() - postedAt.getTime() < FRESH_WINDOW_MS) {
      await sendSignalNotifications({
        kind: "NEW",
        signal: {
          id: created?.id ?? null,
          symbol,
          side,
          entry_price: entryPrice,
          take_profit: takeProfit,
          stop_loss: stopLoss,
          notes: String(get("notes") ?? "") || null,
        },
      });
    }
  } catch (err) {
    return failure(err, t);
  }
  return { ok: true };
}

export async function updateSignalStatusCore(
  ctx: AdminCtx,
  signalId: string,
  status: string,
  currentPrice: number | null,
  resultPips: number | null,
  closedAtInput: string | null,
  resultFile: File | null
): Promise<ActionResult> {
  const { t, supabase } = ctx;

  if (!ALL_SIGNAL_STATUSES.includes(status)) return { ok: false, message: t("Status tidak valid.") };

  const isTerminal = TERMINAL_SIGNAL_STATUSES.includes(status);
  let closedAt: Date | null = null;

  try {
    if (isTerminal) {
      // Kosong = sekarang (perilaku lama). Isi untuk sinyal lama yang ditutup di tanggal lain.
      closedAt = parseWibDateTime(closedAtInput) ?? new Date();
      if (closedAt.getTime() > Date.now() + FUTURE_TOLERANCE_MS) {
        return { ok: false, message: t("Tanggal ditutup tidak boleh di masa depan.") };
      }
      const { data: existing } = await supabase.from("signals").select("posted_at").eq("id", signalId).single();
      if (existing && closedAt.getTime() < new Date(existing.posted_at).getTime()) {
        return { ok: false, message: t("Tanggal ditutup tidak boleh sebelum tanggal sinyal dibuat.") };
      }
    }
  } catch (err) {
    return failure(err, t);
  }

  const updatePayload: Record<string, unknown> = {
    status,
    current_price: currentPrice,
    current_price_at: currentPrice !== null ? (closedAt ?? new Date()).toISOString() : null,
    result_pips: resultPips,
    closed_at: closedAt ? closedAt.toISOString() : null,
  };

  // Kalau admin nggak isi Take Profit waktu posting sinyal (dibiarkan kosong),
  // begitu status di-set TP, harga penutupan yang diinput langsung dipakai
  // sebagai nilai Take Profit — supaya tetap tampil di tabel, bukan cuma
  // tersimpan di current_price.
  if (status === "TP" && currentPrice !== null) {
    updatePayload.take_profit = currentPrice;
  }

  // Foto hasil (opsional): hanya untuk status penutupan. Kosong = foto lama tidak diubah.
  if (isTerminal) {
    if (resultFile && resultFile.size > 0) {
      const resultUrl = await uploadToR2(resultFile, `signal-results/${signalId}-${Date.now()}`);
      if (!resultUrl) return { ok: false, message: t("Gagal upload foto hasil. Pakai JPG/PNG/WebP maksimal 2 MB.") };
      updatePayload.result_image_url = resultUrl;
    }
  }

  const { data: before } = await supabase
    .from("signals")
    .select("symbol, side, status")
    .eq("id", signalId)
    .single();

  const { error } = await supabase.from("signals").update(updatePayload).eq("id", signalId);
  if (error) return { ok: false, message: t("Gagal menyimpan: {detail}", { detail: error.message }) };

  await logAudit(supabase, {
    actor: ctx.actor,
    action: "SIGNAL_STATUS_CHANGED",
    targetId: signalId,
    details: {
      symbol: before?.symbol ?? null,
      from_status: before?.status ?? null,
      to_status: status,
      result_pips: resultPips,
      closing_price: currentPrice,
    },
  });

  // Email penutupan hanya kalau status berubah & penutupannya baru terjadi (30 menit terakhir).
  if (isTerminal && closedAt && before?.status !== status && Date.now() - closedAt.getTime() < FRESH_WINDOW_MS) {
    const { data: full } = await supabase
      .from("signals")
      .select("symbol, side, entry_price, take_profit, stop_loss, status, result_pips")
      .eq("id", signalId)
      .single();
    if (full) await sendSignalNotifications({ kind: "CLOSED", signal: { ...full, id: signalId } });
  }
  return { ok: true };
}

const SIGNAL_UPDATE_TYPES = ["SL_TO_BE", "PARTIAL_CLOSE", "MOVE_SL", "MOVE_TP", "NOTE"];

export async function addSignalUpdateCore(ctx: AdminCtx, get: Getter): Promise<ActionResult> {
  const { t, supabase } = ctx;

  const signalId = String(get("signal_id") ?? "");
  const type = String(get("type") ?? "");
  const message = String(get("message") ?? "").trim().slice(0, 500) || null;
  const price = optionalNumber(get("price"));
  const sendEmail = get("send_email") === "1";

  if (!signalId) return { ok: false, message: t("Terjadi kesalahan.") };
  if (!SIGNAL_UPDATE_TYPES.includes(type)) return { ok: false, message: t("Jenis update tidak valid.") };
  if (type === "NOTE" && !message) return { ok: false, message: t("Pesan wajib diisi untuk jenis Catatan.") };

  const { data: signal } = await supabase
    .from("signals")
    .select("symbol, side, entry_price, take_profit, stop_loss, status, result_pips")
    .eq("id", signalId)
    .single();
  if (!signal) return { ok: false, message: t("Sinyal tidak ditemukan.") };

  const actor = ctx.actor;
  const { error } = await supabase.from("signal_updates").insert({
    signal_id: signalId,
    type,
    message,
    price,
    created_by: actor.id,
  });
  if (error) return { ok: false, message: t("Gagal menyimpan: {detail}", { detail: error.message }) };

  await logAudit(supabase, {
    actor,
    action: "SIGNAL_UPDATE_POSTED",
    targetId: signalId,
    details: { symbol: signal.symbol, type, price, message },
  });

  if (sendEmail) {
    await sendSignalNotifications({ kind: "UPDATE", signal: { ...signal, id: signalId }, updateType: type, message, price });
  }
  return { ok: true };
}

export async function deleteSignalCore(ctx: AdminCtx, signalId: string): Promise<ActionResult> {
  const { supabase } = ctx;
  const { data: existing } = await supabase
    .from("signals")
    .select("symbol, side, status, entry_price")
    .eq("id", signalId)
    .single();
  await supabase.from("signals").delete().eq("id", signalId);
  await logAudit(supabase, {
    actor: ctx.actor,
    action: "SIGNAL_DELETED",
    targetId: signalId,
    details: { ...(existing ?? {}) },
  });
  return { ok: true };
}

/** Tambah video Akademi. */
export async function addAcademyVideoCore(ctx: AdminCtx, get: Getter): Promise<ActionResult> {
  const category = text(get("category"));
  const title = text(get("title")).trim().slice(0, 200);
  const videoUrl = text(get("video_url")).trim().slice(0, 1000);
  const thumbnailUrl = text(get("thumbnail_url")).trim().slice(0, 1000);
  if (!VIDEO_CATEGORIES.includes(category)) return { ok: false, message: ctx.t("Kategori tidak valid.") };
  if (!title) return { ok: false, message: ctx.t("Judul wajib diisi.") };
  if (!/^https?:\/\//i.test(videoUrl)) return { ok: false, message: ctx.t("Link video tidak valid.") };

  const { error } = await ctx.supabase.from("academy_videos").insert({
    category,
    title,
    description: text(get("description")).trim().slice(0, 2000) || null,
    thumbnail_url: thumbnailUrl,
    video_url: videoUrl,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function deleteAcademyVideoCore(ctx: AdminCtx, id: string): Promise<ActionResult> {
  const { error } = await ctx.supabase.from("academy_videos").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/** Tambah soal kuis Akademi. Opsi kosong dibuang; jawaban benar = indeks di antara opsi yang terisi. */
export async function addQuizQuestionCore(
  ctx: AdminCtx,
  input: { category: unknown; question: unknown; options: unknown[]; correctIndex: unknown; explanation: unknown }
): Promise<{ success: true } | { success: false; message: string }> {
  const category = text(input.category);
  const question = text(input.question).trim().slice(0, 500);
  const explanation = text(input.explanation).trim().slice(0, 1000) || null;
  const rawOptions = input.options.map((o) => text(o).trim().slice(0, 200));
  const correctRaw = Number(input.correctIndex);

  // Hitung ulang indeks jawaban benar setelah opsi kosong dibuang.
  const options: string[] = [];
  let correctIndex = -1;
  rawOptions.forEach((opt, i) => {
    if (!opt) return;
    if (i === correctRaw) correctIndex = options.length;
    options.push(opt);
  });

  if (!VIDEO_CATEGORIES.includes(category)) return { success: false, message: "Kategori tidak valid." };
  if (question.length < 5) return { success: false, message: "Pertanyaan minimal 5 karakter." };
  if (options.length < 2) return { success: false, message: "Isi minimal 2 pilihan jawaban." };
  if (options.length > 6) return { success: false, message: "Maksimal 6 pilihan jawaban." };
  if (correctIndex < 0) return { success: false, message: "Pilih jawaban yang benar (pilihan yang terisi)." };

  const { error } = await ctx.supabase.from("academy_quiz_questions").insert({
    category,
    question,
    options,
    correct_index: correctIndex,
    explanation,
  });
  if (error) {
    return {
      success: false,
      message: /academy_quiz|relation|schema cache/i.test(error.message)
        ? "Database belum diperbarui. Jalankan supabase/academy-progress-quiz.sql."
        : error.message,
    };
  }
  return { success: true };
}

export async function deleteQuizQuestionCore(ctx: AdminCtx, id: string): Promise<ActionResult> {
  const { error } = await ctx.supabase.from("academy_quiz_questions").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/** Kirim pengumuman ke semua user (bisa per tier) atau ke satu user (email). Mengembalikan pesan hasil. */
export async function sendAdminNotificationCore(ctx: AdminCtx, get: Getter): Promise<{ message: string; ok: boolean }> {
  const { t, supabase } = ctx;

  const target = String(get("target"));
  const title = String(get("title") ?? "").trim();
  const message = String(get("message") ?? "").trim();
  if (!title || !message) return { ok: false, message: t("Judul dan pesan wajib diisi.") };

  const channels = {
    website: text(get("ch_website")) === "true",
    email: text(get("ch_email")) === "true",
    push: text(get("ch_push")) === "true",
  };
  if (!channels.website && !channels.email && !channels.push) {
    return { ok: false, message: t("Pilih minimal satu kanal pengiriman.") };
  }
  const channelLabel = [channels.push && "push", channels.website && "website", channels.email && "email"].filter(Boolean).join("+");

  if (target === "ALL") {
    const rawAudience = String(get("audience") ?? "ALL");
    const audience = rawAudience === "FREE" || rawAudience === "VIP" || rawAudience === "MEMBERSHIP" ? rawAudience : "ALL";
    const { recipients } = await notifyAllUsers({ type: "ANNOUNCEMENT", title, message, channels, tier: audience });
    await logAudit(supabase, {
      actor: ctx.actor,
      action: "ANNOUNCEMENT_SENT",
      details: { target: "ALL", audience, title, channel: channelLabel, recipients },
    });
    if (audience === "ALL") return { ok: true, message: t("Notifikasi terkirim ke semua user.") };
    return { ok: true, message: t("Notifikasi terkirim ke {n} user tier {tier}.", { n: recipients, tier: audience }) };
  }

  const email = String(get("email") ?? "");
  const { data: targetProfile } = await supabase.from("profiles").select("id, email").eq("email", email).single();

  if (!targetProfile) {
    return { ok: false, message: t("User dengan email itu nggak ketemu.") };
  }

  await notifyUser({
    userId: targetProfile.id,
    email: targetProfile.email,
    type: "ANNOUNCEMENT",
    title,
    message,
    channels,
  });

  await logAudit(supabase, {
    actor: ctx.actor,
    action: "ANNOUNCEMENT_SENT",
    targetUserId: targetProfile.id,
    details: { target: email, title, channel: channelLabel },
  });

  return { ok: true, message: t("Notifikasi terkirim ke {email}.", { email }) };
}
