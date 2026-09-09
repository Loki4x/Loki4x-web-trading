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

function mapVolatility(raw: unknown): "HIGH" | "MEDIUM" | "LOW" {
  const s = String(raw ?? "").toUpperCase();
  if (s === "HIGH") return "HIGH";
  if (s === "MEDIUM") return "MEDIUM";
  return "LOW";
}

export async function syncNewsFromApi() {
  const supabase = await assertIsAdmin();

  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    return { success: false as const, message: "RAPIDAPI_KEY belum diset di Environment Variables" };
  }

  let res: Response;
  try {
    res = await fetch("https://economic-calendar-api.p.rapidapi.com/calendar?limit=100", {
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "economic-calendar-api.p.rapidapi.com",
      },
      cache: "no-store",
    });
  } catch {
    return { success: false as const, message: "Gagal menghubungi server API (network error)." };
  }

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    return {
      success: false as const,
      message: `API menolak request (status ${res.status}). ${bodyText}`,
    };
  }

  const data = await res.json();
  const events: any[] = Array.isArray(data) ? data : data.data ?? data.events ?? data.results ?? data.calendar ?? [];

  const rows = events
    .filter((e) => e.name && e.dateUtc)
    .map((e) => ({
      event_title: String(e.name),
      currency: String(e.currencyCode ?? e.countryCode ?? "").toUpperCase(),
      impact_level: mapVolatility(e.volatility),
      release_time: new Date(e.dateUtc).toISOString(),
      actual: e.actual !== null && e.actual !== undefined && e.actual !== "" ? String(e.actual) : null,
      forecast: e.consensus !== null && e.consensus !== undefined && e.consensus !== "" ? String(e.consensus) : null,
      previous: e.previous !== null && e.previous !== undefined && e.previous !== "" ? String(e.previous) : null,
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
