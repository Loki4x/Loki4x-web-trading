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
