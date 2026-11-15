"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { uploadToR2 } from "@/lib/r2";
import { STRATEGY_MAX_LEN, isEmotion, parseFollowedPlan } from "@/lib/journal-tags";
import { SYMBOL_RE, cleanText, isUuid, isValidDate, ownedPhotoUrl } from "@/lib/validation";
import { pipsBetween, round1 } from "@/lib/signal-pips";
import type { ImportRow } from "@/lib/trade-import";
import { loadRiskContext, notifyRiskLimit } from "@/lib/risk-alert";
import { todayWib } from "@/lib/discipline";
import { getT } from "@/lib/i18n/server";

/** Maksimal baris per panggilan importTrades (klien mengirim bertahap). */
const IMPORT_BATCH = 500;
const SESSIONS = ["LONDON", "NEW_YORK", "ASIA", "OVERLAP"];

const finiteOrNull = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) && Math.abs(v) < 1e12 ? v : null;

/**
 * Import trade hasil parsing file MT4/MT5/CSV (lib/trade-import.ts) ke satu akun.
 * Data dari klien divalidasi ulang di sini. Trade dengan external_id yang sudah ada di akun itu dilewati.
 */
export async function importTrades(accountId: string, rows: ImportRow[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false as const, message: "Not authenticated" };
  if (!isUuid(accountId) || !Array.isArray(rows) || rows.length > IMPORT_BATCH) {
    return { success: false as const, message: "Invalid request" };
  }

  const { data: ownedAccount } = await supabase
    .from("trading_accounts")
    .select("id")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!ownedAccount) return { success: false as const, message: "Invalid account" };

  let invalid = 0;
  const valid = rows.flatMap((r) => {
    const symbol = String(r?.symbol ?? "").trim().toUpperCase();
    const entry = finiteOrNull(r?.entry_price);
    const exit = finiteOrNull(r?.exit_price);
    const pnl = finiteOrNull(r?.pnl);
    const side = r?.side;
    const tradeDate = String(r?.trade_date ?? "");
    if (
      !SYMBOL_RE.test(symbol) ||
      (side !== "BUY" && side !== "SELL") ||
      entry === null ||
      entry <= 0 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(tradeDate) ||
      !isValidDate(tradeDate)
    ) {
      invalid++;
      return [];
    }
    let pips = finiteOrNull(r.pips);
    if (pips === null && exit !== null) pips = round1(pipsBetween(symbol, side, entry, exit));
    const externalId = typeof r.external_id === "string" ? r.external_id.trim().slice(0, 64) || null : null;
    const emotionRaw = String(r.emotion ?? "");
    return [
      {
        user_id: user.id,
        account_id: accountId,
        symbol,
        side,
        entry_price: entry,
        exit_price: exit,
        pips,
        pnl,
        trade_date: tradeDate,
        status: exit !== null || pnl !== null ? "CLOSED" : "OPEN",
        session: SESSIONS.includes(String(r.session)) ? String(r.session) : null,
        notes: cleanText(r.notes ?? "", 5000) || null,
        confluence: cleanText(r.confluence ?? "", 2000) || null,
        strategy: cleanText(r.strategy ?? "", STRATEGY_MAX_LEN) || null,
        emotion: isEmotion(emotionRaw) ? emotionRaw : null,
        followed_plan: typeof r.followed_plan === "boolean" ? r.followed_plan : null,
        external_id: externalId,
      },
    ];
  });

  // Lewati trade yang sudah pernah di-import ke akun ini (dan duplikat di dalam file yang sama).
  const ids = valid.map((v) => v.external_id).filter((id): id is string => !!id);
  const existing = new Set<string>();
  if (ids.length > 0) {
    const { data, error } = await supabase
      .from("trades")
      .select("external_id")
      .eq("account_id", accountId)
      .in("external_id", ids);
    if (error) {
      const missingColumn = /external_id|column|schema cache/i.test(error.message);
      return {
        success: false as const,
        message: missingColumn
          ? "Database belum diperbarui. Admin perlu menjalankan supabase/discipline-import.sql."
          : error.message,
      };
    }
    for (const d of data ?? []) if (d.external_id) existing.add(d.external_id);
  }
  let duplicates = 0;
  const toInsert = valid.filter((v) => {
    if (!v.external_id) return true;
    if (existing.has(v.external_id)) {
      duplicates++;
      return false;
    }
    existing.add(v.external_id);
    return true;
  });

  const today = todayWib();
  const riskCtx = toInsert.some((v) => v.trade_date === today) ? await loadRiskContext(supabase, user.id, accountId) : null;

  if (toInsert.length > 0) {
    const { error } = await supabase.from("trades").insert(toInsert);
    if (error) return { success: false as const, message: error.message };
  }

  if (riskCtx) {
    const { t } = await getT();
    const now = Date.now();
    await notifyRiskLimit(
      user.id,
      riskCtx,
      [
        ...riskCtx.trades,
        ...toInsert.map((v, i) => ({
          trade_date: v.trade_date,
          pnl: v.pnl,
          status: v.status as "OPEN" | "CLOSED",
          followed_plan: v.followed_plan,
          created_at: new Date(now + i).toISOString(),
        })),
      ],
      t
    );
  }

  revalidatePath("/trades");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  return { success: true as const, inserted: toInsert.length, duplicates, invalid };
}

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
  const strategy = cleanText(formData.get("strategy"), STRATEGY_MAX_LEN) || null;
  const emotionRaw = String(formData.get("emotion") ?? "");
  const emotion = isEmotion(emotionRaw) ? emotionRaw : null;
  const followedPlan = parseFollowedPlan(formData.get("followed_plan"));
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

  // Status aturan risiko sebelum trade ini (hanya kalau trade-nya untuk hari ini).
  const riskCtx = tradeDate === todayWib() ? await loadRiskContext(supabase, user.id, accountId) : null;

  const { error: insertError } = await supabase.from("trades").insert({
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
    strategy,
    emotion,
    followed_plan: followedPlan,
    before_photo_url: beforePhotoUrl,
    after_photo_url: afterPhotoUrl,
  });

  if (!insertError && riskCtx) {
    const { t } = await getT();
    await notifyRiskLimit(
      user.id,
      riskCtx,
      [...riskCtx.trades, { trade_date: tradeDate, pnl, status, followed_plan: followedPlan, created_at: new Date().toISOString() }],
      t
    );
  }

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
  const strategy = cleanText(formData.get("strategy"), STRATEGY_MAX_LEN) || null;
  const emotionRaw = String(formData.get("emotion") ?? "");
  const emotion = isEmotion(emotionRaw) ? emotionRaw : null;
  const followedPlan = parseFollowedPlan(formData.get("followed_plan"));
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

  // Status aturan risiko sebelum perubahan (hanya kalau trade lama/baru jatuh di hari ini).
  const today = todayWib();
  const { data: oldTrade } = await supabase
    .from("trades")
    .select("account_id, trade_date")
    .eq("id", tradeId)
    .eq("user_id", user.id)
    .maybeSingle();
  const riskCtx =
    oldTrade?.account_id && (oldTrade.trade_date === today || tradeDate === today)
      ? await loadRiskContext(supabase, user.id, oldTrade.account_id)
      : null;

  const { error: updateError } = await supabase
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
      strategy,
      emotion,
      followed_plan: followedPlan,
      before_photo_url: beforePhotoUrl,
      after_photo_url: afterPhotoUrl,
    })
    .eq("id", tradeId)
    .eq("user_id", user.id);

  if (!updateError && riskCtx) {
    const { t } = await getT();
    await notifyRiskLimit(
      user.id,
      riskCtx,
      riskCtx.trades.map((tr) =>
        tr.id === tradeId ? { ...tr, trade_date: tradeDate, pnl, status, followed_plan: followedPlan } : tr
      ),
      t
    );
  }

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
