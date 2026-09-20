"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifyUser, notifyAllUsers } from "@/lib/notifications";
import { simulatePakasirPayment } from "@/lib/pakasir";
import { planToTier, isLifetimePlan, type Plan } from "@/lib/pakasir-constants";

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
    await notifyUser({
      userId,
      email: targetProfile?.email ?? null,
      type: "TIER_UPGRADE",
      title: `Selamat! Akun kamu sekarang ${tier}`,
      message: `Akun kamu berhasil di-upgrade ke tier ${tier}. Nikmati semua fitur yang terbuka sekarang!`,
    });
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin");
}
export async function toggleSuspend(userId: string, suspend: boolean) {
  const supabase = await assertIsAdmin();

  await supabase.from("profiles").update({ is_suspended: suspend }).eq("id", userId);

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

export async function addSignal(formData: FormData) {
  const supabase = await assertIsAdmin();

  const takeProfitRaw = formData.get("take_profit");
  const stopLossRaw = formData.get("stop_loss");

  await supabase.from("signals").insert({
    symbol: String(formData.get("symbol")).toUpperCase(),
    side: String(formData.get("side")),
    entry_price: Number(formData.get("entry_price")),
    take_profit: takeProfitRaw ? Number(takeProfitRaw) : null,
    stop_loss: stopLossRaw ? Number(stopLossRaw) : null,
    notes: String(formData.get("notes") ?? "") || null,
  });

  revalidatePath("/admin/signals");
  revalidatePath("/signals");
}

export async function updateSignalStatus(signalId: string, status: string, resultPips: number | null) {
  const supabase = await assertIsAdmin();

  await supabase.from("signals").update({ status, result_pips: resultPips }).eq("id", signalId);

  revalidatePath("/admin/signals");
  revalidatePath("/signals");
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

  await notifyUser({
    userId,
    email: targetProfile?.email ?? null,
    type: "TIER_UPGRADE",
    title: "Selamat! Akun kamu sekarang VIP",
    message: "Pengajuan upgrade VIP kamu disetujui. Nikmati Signals & Positioning sekarang!",
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
    return { message: "Notifikasi terkirim ke semua user." };
  }

  const email = String(formData.get("email") ?? "");
  const { data: targetProfile } = await supabase.from("profiles").select("id, email").eq("email", email).single();

  if (!targetProfile) {
    return { message: "User dengan email itu nggak ketemu." };
  }

  await notifyUser({
    userId: targetProfile.id,
    email: targetProfile.email,
    type: "ANNOUNCEMENT",
    title,
    message,
    channels,
  });

  return { message: `Notifikasi terkirim ke ${email}.` };
}

// Testing khusus mode Sandbox Pakasir — jangan pakai di mode Live/Production.
export async function simulateSandboxPayment(orderId: string, amount: number) {
  await assertIsAdmin();

  const result = await simulatePakasirPayment({ orderId, amount });

  if (!result.ok) {
    return { success: false, message: `Gagal simulasi: ${JSON.stringify(result.data)}` };
  }

  revalidatePath("/admin/pakasir-sandbox");
  return {
    success: true,
    message: "Simulasi terkirim ke Pakasir. Webhook biasanya masuk dalam beberapa detik — refresh halaman ini.",
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

  const expiryLabel = newExpiry
    ? `sampai ${newExpiry.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`
    : "selamanya (lifetime)";

  await notifyUser({
    userId,
    email: targetProfile?.email ?? null,
    type: "TIER_UPGRADE",
    title: `Pembayaran ${plan} berhasil dikonfirmasi`,
    message: `Pembayaran USDT kamu sudah diverifikasi admin. Akun kamu sekarang aktif sebagai ${tier} ${expiryLabel}.`,
  });

  revalidatePath("/admin/usdt-payments");
  revalidatePath("/upgrade");
}

export async function rejectUsdtPayment(paymentId: string) {
  const supabase = await assertIsAdmin();
  await supabase.from("payments").update({ status: "FAILED" }).eq("id", paymentId);
  revalidatePath("/admin/usdt-payments");
}
