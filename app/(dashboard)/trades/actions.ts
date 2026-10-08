"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { uploadToR2 } from "@/lib/r2";
import { SYMBOL_RE, cleanText, isUuid, isValidDate, ownedPhotoUrl } from "@/lib/validation";

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
  const pnlManualRaw = formData.get("pnl_manual");
  const pnlManual = pnlManualRaw && String(pnlManualRaw).length > 0 ? Number(pnlManualRaw) : null;
  const side = String(formData.get("side"));
  const status = exitPrice !== null || pnlManual !== null ? "CLOSED" : "OPEN";
  const sessionRaw = String(formData.get("session") ?? "");
  const session = sessionRaw.length > 0 ? sessionRaw : null;
  const symbol = String(formData.get("symbol") ?? "").trim().toUpperCase();
  const tradeDate = String(formData.get("trade_date") ?? "");
  const notes = cleanText(formData.get("notes"), 5000);
  const confluence = cleanText(formData.get("confluence"), 2000);
  const numbersOk =
    Number.isFinite(entryPrice) && entryPrice > 0 && [exitPrice, pips, pnlManual].every((n) => n === null || Number.isFinite(n));
  const accountId = String(formData.get("account_id") ?? "");
  if (
    !SYMBOL_RE.test(symbol) ||
    (side !== "BUY" && side !== "SELL") ||
    !isUuid(accountId) ||
    !isValidDate(tradeDate) ||
    !numbersOk ||
    (session !== null && session.length > 20)
  ) {
    console.warn("[trades] addTrade ditolak: input tidak valid");
    return;
  }
  // account_id dari form tidak boleh dipercaya begitu saja: harus akun milik user ini.
  const { data: ownedAccount } = await supabase
    .from("trading_accounts")
    .select("id")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!ownedAccount) return;

  let pnl: number | null = null;
  if (pnlManual !== null) {
    pnl = pnlManual;
  } else if (exitPrice !== null) {
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
    account_id: accountId,
    symbol,
    side,
    entry_price: entryPrice,
    exit_price: exitPrice,
    pips,
    pnl,
    trade_date: tradeDate,
    status,
    session,
    notes,
    confluence,
    before_photo_url: beforePhotoUrl,
    after_photo_url: afterPhotoUrl,
  });

  revalidatePath("/trades");
  revalidatePath("/dashboard");
}

export async function updateTrade(tradeId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const entryPrice = Number(formData.get("entry_price"));
  const exitPriceRaw = formData.get("exit_price");
  const exitPrice = exitPriceRaw && String(exitPriceRaw).length > 0 ? Number(exitPriceRaw) : null;
  const pipsRaw = formData.get("pips");
  const pips = pipsRaw && String(pipsRaw).length > 0 ? Number(pipsRaw) : null;
  const pnlManualRaw = formData.get("pnl_manual");
  const pnlManual = pnlManualRaw && String(pnlManualRaw).length > 0 ? Number(pnlManualRaw) : null;
  const side = String(formData.get("side"));
  const status = exitPrice !== null || pnlManual !== null ? "CLOSED" : "OPEN";
  const sessionRaw = String(formData.get("session") ?? "");
  const session = sessionRaw.length > 0 ? sessionRaw : null;
  const symbol = String(formData.get("symbol") ?? "").trim().toUpperCase();
  const tradeDate = String(formData.get("trade_date") ?? "");
  const notes = cleanText(formData.get("notes"), 5000);
  const confluence = cleanText(formData.get("confluence"), 2000);
  const numbersOk =
    Number.isFinite(entryPrice) && entryPrice > 0 && [exitPrice, pips, pnlManual].every((n) => n === null || Number.isFinite(n));
  if (
    !isUuid(tradeId) ||
    !SYMBOL_RE.test(symbol) ||
    (side !== "BUY" && side !== "SELL") ||
    !isValidDate(tradeDate) ||
    !numbersOk ||
    (session !== null && session.length > 20)
  ) {
    console.warn("[trades] updateTrade ditolak: input tidak valid");
    return;
  }

  let pnl: number | null = null;
  if (pnlManual !== null) {
    pnl = pnlManual;
  } else if (exitPrice !== null) {
    pnl = side === "BUY" ? exitPrice - entryPrice : entryPrice - exitPrice;
  }

  async function uploadPhotoIfProvided(field: string, label: string, existingUrl: string | null) {
    const file = formData.get(field) as File | null;
    if (!file || file.size === 0) return existingUrl;
    return uploadToR2(file, `${user!.id}/${label}`);
  }

  const beforePhotoUrl = await uploadPhotoIfProvided(
    "before_photo",
    "before",
    ownedPhotoUrl(String(formData.get("existing_before_photo_url") ?? "") || null, user.id)
  );
  const afterPhotoUrl = await uploadPhotoIfProvided(
    "after_photo",
    "after",
    ownedPhotoUrl(String(formData.get("existing_after_photo_url") ?? "") || null, user.id)
  );

  await supabase
    .from("trades")
    .update({
      symbol,
      side,
      entry_price: entryPrice,
      exit_price: exitPrice,
      pips,
      pnl,
      trade_date: tradeDate,
      status,
      session,
      notes,
      confluence,
      before_photo_url: beforePhotoUrl,
      after_photo_url: afterPhotoUrl,
    })
    .eq("id", tradeId)
    .eq("user_id", user.id);

  revalidatePath("/trades");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}

export async function deleteTrade(tradeId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("trades").delete().eq("id", tradeId).eq("user_id", user.id);
  revalidatePath("/trades");
  revalidatePath("/dashboard");
}
