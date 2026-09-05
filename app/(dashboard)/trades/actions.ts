"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addTrade(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const entryPrice = Number(formData.get("entry_price"));
  const exitPriceRaw = formData.get("exit_price");
  const exitPrice = exitPriceRaw ? Number(exitPriceRaw) : null;
  const side = String(formData.get("side"));
  const status = exitPrice !== null ? "CLOSED" : "OPEN";

  let pnl: number | null = null;
  if (exitPrice !== null) {
    pnl = side === "LONG" ? exitPrice - entryPrice : entryPrice - exitPrice;
  }

  await supabase.from("trades").insert({
    user_id: user.id,
    symbol: String(formData.get("symbol")).toUpperCase(),
    side,
    entry_price: entryPrice,
    exit_price: exitPrice,
    pnl,
    trade_date: String(formData.get("trade_date")),
    status,
    notes: String(formData.get("notes") ?? ""),
  });

  revalidatePath("/trades");
  revalidatePath("/dashboard");
}

export async function deleteTrade(tradeId: string) {
  const supabase = await createClient();
  await supabase.from("trades").delete().eq("id", tradeId);
  revalidatePath("/trades");
  revalidatePath("/dashboard");
}
