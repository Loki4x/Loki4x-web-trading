"use server";

import { getT, getUserT } from "@/lib/i18n/server";
import { dateLocale } from "@/lib/i18n/dictionary";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifyUser, notifyAllUsers } from "@/lib/notifications";
import { simulatePakasirPayment } from "@/lib/pakasir";
import { planToTier, isLifetimePlan, type Plan } from "@/lib/pakasir-constants";
import { uploadToR2 } from "@/lib/r2";
import { createServiceClient } from "@/lib/supabase/service";

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

  const { data: targetProfile } = await supabase.from("profiles").select("email, tier").eq("id", userId).single();

  await supabase
    .from("profiles")
    .update({
      tier,
      vip_expires_at: tier !== "FREE" ? vipExpiresAt : null,
    })
    .eq("id", userId);

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

// ---------------------------------------------------------------------------
// Helper tanggal sinyal. (Tidak di-export: file "use server" cuma boleh
// meng-export fungsi async.)
// ---------------------------------------------------------------------------

type ActionResult = { ok: boolean; message?: string };

const TERMINAL_SIGNAL_STATUSES = ["TP", "SL", "PARTIAL", "CANCEL", "MISS"];
const ALL_SIGNAL_STATUSES = ["OPEN", "HIT_ENTRY", ...TERMINAL_SIGNAL_STATUSES];
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

export async function addSignal(formData: FormData): Promise<ActionResult> {
  const { t } = await getT();
  const supabase = await assertIsAdmin();

  try {
    const symbol = String(formData.get("symbol") ?? "").trim().toUpperCase();
    const side = String(formData.get("side") ?? "");
    const status = String(formData.get("status") ?? "OPEN");
    const entryPrice = optionalNumber(formData.get("entry_price"));
    let takeProfit = optionalNumber(formData.get("take_profit"));
    const stopLoss = optionalNumber(formData.get("stop_loss"));
    const riskPercent = optionalNumber(formData.get("risk_percent")) ?? 2;

    if (!symbol) return { ok: false, message: t("Symbol wajib diisi.") };
    if (side !== "BUY" && side !== "SELL") return { ok: false, message: t("Side harus BUY atau SELL.") };
    if (entryPrice === null || entryPrice <= 0) return { ok: false, message: t("Entry price tidak valid.") };
    if (!ALL_SIGNAL_STATUSES.includes(status)) return { ok: false, message: t("Status tidak valid.") };

    // Tanggal sinyal: kosong = sekarang (perilaku lama). Isi untuk memasukkan sinyal lama.
    const postedAt = parseWibDateTime(formData.get("posted_at")) ?? new Date();
    if (postedAt.getTime() > Date.now() + FUTURE_TOLERANCE_MS) {
      return { ok: false, message: t("Tanggal sinyal tidak boleh di masa depan.") };
    }

    const isTerminal = TERMINAL_SIGNAL_STATUSES.includes(status);
    let closedAt: Date | null = null;
    let currentPrice: number | null = null;
    let resultPips: number | null = null;

    if (isTerminal) {
      // Tanggal ditutup kosong = sama dengan tanggal sinyal (umumnya untuk sinyal lama).
      closedAt = parseWibDateTime(formData.get("closed_at")) ?? postedAt;
      if (closedAt.getTime() > Date.now() + FUTURE_TOLERANCE_MS) {
        return { ok: false, message: t("Tanggal ditutup tidak boleh di masa depan.") };
      }
      if (closedAt.getTime() < postedAt.getTime()) {
        return { ok: false, message: t("Tanggal ditutup tidak boleh sebelum tanggal sinyal.") };
      }
    }

    if (RESULT_SIGNAL_STATUSES.includes(status)) {
      // Harga penutupan kosong: TP memakai Take Profit, SL memakai Stop Loss.
      let closing = optionalNumber(formData.get("closing_price"));
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
      resultPips = optionalNumber(formData.get("result_pips")) ?? 0;
      // Sama seperti updateSignalStatus: kalau TP, harga penutupan jadi nilai Take Profit.
      if (status === "TP") takeProfit = closing;
    }

    const chartImageFile = formData.get("chart_image") as File | null;
    const chartImageUrl = await uploadToR2(chartImageFile, `signals/${symbol}-${Date.now()}`);

    const { error } = await supabase.from("signals").insert({
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
      notes: String(formData.get("notes") ?? "") || null,
      chart_image_url: chartImageUrl,
      posted_at: postedAt.toISOString(),
      closed_at: closedAt ? closedAt.toISOString() : null,
    });
    if (error) return { ok: false, message: t("Gagal menyimpan: {detail}", { detail: error.message }) };
  } catch (err) {
    return failure(err, t);
  }

  revalidatePath("/admin/signals");
  revalidatePath("/signals");
  return { ok: true };
}

export async function updateSignalStatus(
  signalId: string,
  status: string,
  currentPrice: number | null,
  resultPips: number | null,
  closedAtInput: string | null = null
): Promise<ActionResult> {
  const { t } = await getT();
  const supabase = await assertIsAdmin();

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

  const { error } = await supabase.from("signals").update(updatePayload).eq("id", signalId);
  if (error) return { ok: false, message: t("Gagal menyimpan: {detail}", { detail: error.message }) };

  revalidatePath("/admin/signals");
  revalidatePath("/signals");
  return { ok: true };
}

export async function deleteSignal(signalId: string) {
  const supabase = await assertIsAdmin();
  await supabase.from("signals").delete().eq("id", signalId);
  revalidatePath("/admin/signals");
  revalidatePath("/signals");
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
  const supabase = await assertIsAdmin();

  await supabase.from("academy_videos").insert({
    category: String(formData.get("category")),
    title: String(formData.get("title")),
    description: String(formData.get("description") ?? "") || null,
    thumbnail_url: String(formData.get("thumbnail_url")),
    video_url: String(formData.get("video_url")),
  });

  revalidatePath("/admin/academy");
  revalidatePath("/academy/technical");
  revalidatePath("/academy/fundamental");
  revalidatePath("/academy/psychology");
}

export async function deleteAcademyVideo(id: string) {
  const supabase = await assertIsAdmin();
  await supabase.from("academy_videos").delete().eq("id", id);
  revalidatePath("/admin/academy");
  revalidatePath("/academy/technical");
  revalidatePath("/academy/fundamental");
  revalidatePath("/academy/psychology");
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

export async function approveVipRequest(requestId: string, userId: string) {
  const supabase = await assertIsAdmin();

  await supabase
    .from("vip_ib_requests")
    .update({ status: "APPROVED", reviewed_at: new Date().toISOString() })
    .eq("id", requestId);

  const { data: targetProfile } = await supabase.from("profiles").select("email").eq("id", userId).single();

  await supabase.from("profiles").update({ tier: "VIP" }).eq("id", userId);

  const { t: tu } = await getUserT(supabase, userId);
  await notifyUser({
    userId,
    email: targetProfile?.email ?? null,
    type: "TIER_UPGRADE",
    title: tu("Selamat! Akun kamu sekarang VIP"),
    message: tu("Pengajuan upgrade VIP kamu disetujui. Nikmati Signals & Positioning sekarang!"),
  });

  revalidatePath("/admin/vip-requests");
  revalidatePath("/upgrade");
}

export async function rejectVipRequest(requestId: string) {
  const supabase = await assertIsAdmin();

  await supabase
    .from("vip_ib_requests")
    .update({ status: "REJECTED", reviewed_at: new Date().toISOString() })
    .eq("id", requestId);

  revalidatePath("/admin/vip-requests");
}

export async function sendAdminNotification(formData: FormData) {
  const { t } = await getT();
  const supabase = await assertIsAdmin();

  const target = String(formData.get("target"));
  const title = String(formData.get("title"));
  const message = String(formData.get("message"));

  const channelValue = String(formData.get("channel") ?? "BOTH");
  const channels = {
    website: channelValue === "BOTH" || channelValue === "WEBSITE",
    email: channelValue === "BOTH" || channelValue === "EMAIL",
  };

  if (target === "ALL") {
    await notifyAllUsers({ type: "ANNOUNCEMENT", title, message, channels });
    return { message: t("Notifikasi terkirim ke semua user.") };
  }

  const email = String(formData.get("email") ?? "");
  const { data: targetProfile } = await supabase.from("profiles").select("id, email").eq("email", email).single();

  if (!targetProfile) {
    return { message: t("User dengan email itu nggak ketemu.") };
  }

  await notifyUser({
    userId: targetProfile.id,
    email: targetProfile.email,
    type: "ANNOUNCEMENT",
    title,
    message,
    channels,
  });

  return { message: t("Notifikasi terkirim ke {email}.", { email }) };
}

// Testing khusus mode Sandbox Pakasir — jangan pakai di mode Live/Production.
export async function simulateSandboxPayment(orderId: string, amount: number) {
  const { t } = await getT();
  await assertIsAdmin();

  const result = await simulatePakasirPayment({ orderId, amount });

  if (!result.ok) {
    return { success: false, message: t("Gagal simulasi: {detail}", { detail: JSON.stringify(result.data) }) };
  }

  revalidatePath("/admin/pakasir-sandbox");
  return {
    success: true,
    message: t("Simulasi terkirim ke Pakasir. Webhook biasanya masuk dalam beberapa detik — refresh halaman ini."),
  };
}

export async function approveUsdtPayment(paymentId: string, userId: string, plan: Plan) {
  const supabase = await assertIsAdmin();

  await supabase
    .from("payments")
    .update({ status: "COMPLETED", completed_at: new Date().toISOString() })
    .eq("id", paymentId);

  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("email, vip_expires_at")
    .eq("id", userId)
    .single();

  const tier = planToTier(plan);
  const lifetime = isLifetimePlan(plan);

  // Lifetime: nggak pernah kedaluwarsa (vip_expires_at = null). Bulanan:
  // perpanjang 30 hari dari sekarang, atau dari tanggal expired saat ini
  // kalau membership-nya masih aktif — sama seperti alur Pakasir otomatis.
  const now = new Date();
  const currentExpiry = targetProfile?.vip_expires_at ? new Date(targetProfile.vip_expires_at) : null;
  const base = currentExpiry && currentExpiry > now ? currentExpiry : now;
  const newExpiry = lifetime ? null : new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);

  await supabase
    .from("profiles")
    .update({ tier, vip_expires_at: newExpiry ? newExpiry.toISOString() : null })
    .eq("id", userId);

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

  revalidatePath("/admin/usdt-payments");
  revalidatePath("/upgrade");
}

export async function rejectUsdtPayment(paymentId: string) {
  const supabase = await assertIsAdmin();
  await supabase.from("payments").update({ status: "FAILED" }).eq("id", paymentId);
  revalidatePath("/admin/usdt-payments");
}
