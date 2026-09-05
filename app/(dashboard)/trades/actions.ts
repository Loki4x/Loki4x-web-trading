"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { uploadToR2 } from "@/lib/r2";

export async function addTrade(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const entryPrice = Number(formData.get("entry_price"));
  const exitPriceRaw = formData.get("exit_price");
  const exitPrice = exitPriceRaw ? Number(exitPriceRaw) : null;
  const pipsRaw = formData.get("pips");
  const pips = pipsRaw && String(pipsRaw).length > 0 ? Number(pipsRaw) : null;
  const side = String(formData.get("side"));
  const status = exitPrice !== null ? "CLOSED" : "OPEN";

  let pnl: number | null = null;
  if (exitPrice !== null) {
    pnl = side === "BUY" ? exitPrice - entryPrice : entryPrice - exitPrice;
  }

  async function uploadPhoto(field: string, label: string) {
    const file = formData.get(field) as File | null;
    return uploadToR2(file, `${user!.id}/${label}`);
  }

  const beforePhotoUrl = await uploadPhoto("before_photo", "before");
  const afterPhotoUrl = await uploadPhoto("after_photo", "after");

  await supabase.from("trades").insert({
    user_id: user.id,
    symbol: String(formData.get("symbol")).toUpperCase(),
    side,
    entry_price: entryPrice,
    exit_price: exitPrice,
    pips,
    pnl,
    trade_date: String(formData.get("trade_date")),
    status,
    notes: String(formData.get("notes") ?? ""),
    before_photo_url: beforePhotoUrl,
    after_photo_url: afterPhotoUrl,
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
