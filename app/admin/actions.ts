"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

export async function updateUserTier(userId: string, tier: "FREE" | "VIP", vipExpiresAt: string | null) {
  const supabase = await assertIsAdmin();

  await supabase
    .from("profiles")
    .update({
      tier,
      vip_expires_at: tier === "VIP" ? vipExpiresAt : null,
    })
    .eq("id", userId);

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

function mapImpact(raw: unknown): "HIGH" | "MEDIUM" | "LOW" {
  const s = String(raw ?? "").toLowerCase();
  if (s.includes("high") || s === "3") return "HIGH";
  if (s.includes("medium") || s === "2") return "MEDIUM";
  return "LOW";
}

export async function syncNewsFromApi() {
  const supabase = await assertIsAdmin();

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return { success: false as const, message: "FINNHUB_API_KEY belum diset di Environment Variables" };
  }

  const from = new Date().toISOString().slice(0, 10);
  const toDate = new Date();
  toDate.setDate(toDate.getDate() + 14);
  const to = toDate.toISOString().slice(0, 10);

  let res: Response;
  try {
    res = await fetch(
      `https://finnhub.io/api/v1/calendar/economic?from=${from}&to=${to}&token=${apiKey}`,
      { cache: "no-store" }
    );
  } catch {
    return { success: false as const, message: "Gagal menghubungi server Finnhub (network error)." };
  }

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    return {
      success: false as const,
      message: `Finnhub menolak request (status ${res.status}). ${bodyText || "Kemungkinan endpoint ini butuh akun premium Finnhub."}`,
    };
  }

  const data = await res.json();
  const events: any[] = data.economicCalendar ?? [];

  const rows = events
    .filter((e) => e.event && e.time)
    .map((e) => ({
      event_title: String(e.event),
      currency: String(e.country ?? "").toUpperCase(),
      impact_level: mapImpact(e.impact),
      release_time: new Date(e.time).toISOString(),
      actual: e.actual !== null && e.actual !== undefined ? String(e.actual) : null,
      forecast: e.estimate !== null && e.estimate !== undefined ? String(e.estimate) : null,
      previous: e.prev !== null && e.prev !== undefined ? String(e.prev) : null,
    }));

  if (rows.length > 0) {
    const { error } = await supabase.from("news").upsert(rows, { onConflict: "event_title,currency,release_time" });
    if (error) {
      return { success: false as const, message: `Gagal simpan ke database: ${error.message}` };
    }
  }

  revalidatePath("/admin/news");
  revalidatePath("/news");

  return { success: true as const, count: rows.length };
}
