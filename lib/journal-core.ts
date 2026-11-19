import type { SupabaseClient } from "@supabase/supabase-js";
import { STRATEGY_MAX_LEN, isEmotion, parseFollowedPlan, type Emotion } from "@/lib/journal-tags";
import { SYMBOL_RE, cleanText, isUuid, isValidDate } from "@/lib/validation";
import { pipsBetween, round1 } from "@/lib/signal-pips";
import type { ImportRow } from "@/lib/trade-import";
import { loadRiskContext, notifyRiskLimit } from "@/lib/risk-alert";
import { todayWib } from "@/lib/discipline";

/**
 * Inti Trading Journal yang dipakai bersama oleh server action web (app/(dashboard)/trades,
 * app/(dashboard)/accounts) dan API aplikasi Android (app/api/mobile/...). Satu tempat untuk
 * validasi input, perhitungan P&L, notifikasi batas risiko, dan import, supaya web & aplikasi
 * selalu memakai aturan yang sama.
 */

type T = (key: string, vars?: Record<string, string | number>) => string;
/** Ambil nilai field (dari FormData web atau body JSON aplikasi). */
export type FieldGetter = (key: string) => unknown;

export const formGetter = (formData: FormData): FieldGetter => (key) => formData.get(key);
export const objectGetter = (obj: Record<string, unknown>): FieldGetter => (key) => obj[key];

const SESSIONS = ["LONDON", "NEW_YORK", "ASIA", "OVERLAP"];
/** Maksimal baris per panggilan import (klien mengirim bertahap). */
export const IMPORT_BATCH = 500;

export interface TradeFields {
  symbol: string;
  side: "BUY" | "SELL";
  entry_price: number;
  exit_price: number | null;
  pips: number | null;
  pnl: number | null;
  trade_date: string;
  status: "OPEN" | "CLOSED";
  session: string | null;
  notes: string;
  confluence: string;
  strategy: string | null;
  emotion: Emotion | null;
  followed_plan: boolean | null;
}

const asText = (v: unknown) => (v === null || v === undefined ? "" : String(v));
/** "" / null -> null, selain itu Number(...) (bisa NaN, dicek di validasi). */
const optionalNumber = (v: unknown) => (asText(v).length > 0 ? Number(asText(v)) : null);

/**
 * Validasi & normalisasi field trade. null = input tidak valid.
 * P&L: pakai P&L manual kalau diisi, kalau tidak dihitung dari selisih harga (sama seperti sebelumnya).
 */
export function parseTradeFields(get: FieldGetter): TradeFields | null {
  const entryPrice = Number(asText(get("entry_price")));
  const exitPrice = optionalNumber(get("exit_price"));
  const pips = optionalNumber(get("pips"));
  const pnlManual = optionalNumber(get("pnl_manual"));
  const side = asText(get("side"));
  const sessionRaw = asText(get("session"));
  const session = sessionRaw.length > 0 ? sessionRaw : null;
  const symbol = asText(get("symbol")).trim().toUpperCase();
  const tradeDate = asText(get("trade_date"));
  const emotionRaw = asText(get("emotion"));
  const followedRaw = get("followed_plan");

  const numbersOk =
    Number.isFinite(entryPrice) && entryPrice > 0 && [exitPrice, pips, pnlManual].every((n) => n === null || Number.isFinite(n));
  if (
    !SYMBOL_RE.test(symbol) ||
    (side !== "BUY" && side !== "SELL") ||
    !isValidDate(tradeDate) ||
    !numbersOk ||
    (session !== null && session.length > 20)
  ) {
    return null;
  }

  let pnl: number | null = null;
  if (pnlManual !== null) pnl = pnlManual;
  else if (exitPrice !== null) pnl = side === "BUY" ? exitPrice - entryPrice : entryPrice - exitPrice;

  return {
    symbol,
    side,
    entry_price: entryPrice,
    exit_price: exitPrice,
    pips,
    pnl,
    trade_date: tradeDate,
    status: exitPrice !== null || pnlManual !== null ? "CLOSED" : "OPEN",
    session,
    notes: cleanText(get("notes") as FormDataEntryValue | null, 5000),
    confluence: cleanText(get("confluence") as FormDataEntryValue | null, 2000),
    strategy: cleanText(get("strategy") as FormDataEntryValue | null, STRATEGY_MAX_LEN) || null,
    emotion: isEmotion(emotionRaw) ? emotionRaw : null,
    followed_plan:
      typeof followedRaw === "boolean" ? followedRaw : parseFollowedPlan(followedRaw as FormDataEntryValue | null),
  };
}

export type CoreResult<X = object> = ({ success: true } & X) | { success: false; message: string };

async function ownsAccount(supabase: SupabaseClient, userId: string, accountId: string): Promise<boolean> {
  if (!isUuid(accountId)) return false;
  const { data } = await supabase.from("trading_accounts").select("id").eq("id", accountId).eq("user_id", userId).maybeSingle();
  return !!data;
}

/** Simpan trade baru + kirim notifikasi kalau batas risiko hari ini baru tercapai. */
export async function createTrade(
  supabase: SupabaseClient,
  userId: string,
  accountId: string,
  fields: TradeFields,
  t: T,
  photos: { before_photo_url?: string | null; after_photo_url?: string | null } = {}
): Promise<CoreResult<{ id: string | null }>> {
  // account_id dari klien tidak boleh dipercaya begitu saja: harus akun milik user ini.
  if (!(await ownsAccount(supabase, userId, accountId))) return { success: false, message: "Invalid account" };

  const riskCtx = fields.trade_date === todayWib() ? await loadRiskContext(supabase, userId, accountId) : null;
  const { data, error } = await supabase
    .from("trades")
    .insert({
      user_id: userId,
      account_id: accountId,
      ...fields,
      before_photo_url: photos.before_photo_url ?? null,
      after_photo_url: photos.after_photo_url ?? null,
    })
    .select("id")
    .maybeSingle();
  if (error) return { success: false, message: error.message };

  if (riskCtx) {
    await notifyRiskLimit(
      userId,
      riskCtx,
      [
        ...riskCtx.trades,
        {
          trade_date: fields.trade_date,
          pnl: fields.pnl,
          status: fields.status,
          followed_plan: fields.followed_plan,
          created_at: new Date().toISOString(),
        },
      ],
      t
    );
  }
  return { success: true, id: (data?.id as string | undefined) ?? null };
}

/** Ubah trade milik user + notifikasi batas risiko kalau trade lama/baru jatuh di hari ini. */
export async function updateTradeCore(
  supabase: SupabaseClient,
  userId: string,
  tradeId: string,
  fields: TradeFields,
  t: T,
  photos?: { before_photo_url: string | null; after_photo_url: string | null }
): Promise<CoreResult> {
  if (!isUuid(tradeId)) return { success: false, message: "Invalid trade" };

  const today = todayWib();
  const { data: oldTrade } = await supabase
    .from("trades")
    .select("account_id, trade_date")
    .eq("id", tradeId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!oldTrade) return { success: false, message: "Trade not found" };
  const riskCtx =
    oldTrade.account_id && (oldTrade.trade_date === today || fields.trade_date === today)
      ? await loadRiskContext(supabase, userId, oldTrade.account_id)
      : null;

  const { error } = await supabase
    .from("trades")
    .update({ ...fields, ...(photos ?? {}) })
    .eq("id", tradeId)
    .eq("user_id", userId);
  if (error) return { success: false, message: error.message };

  if (riskCtx) {
    await notifyRiskLimit(
      userId,
      riskCtx,
      riskCtx.trades.map((tr) =>
        tr.id === tradeId
          ? { ...tr, trade_date: fields.trade_date, pnl: fields.pnl, status: fields.status, followed_plan: fields.followed_plan }
          : tr
      ),
      t
    );
  }
  return { success: true };
}

export async function deleteTradeCore(supabase: SupabaseClient, userId: string, tradeId: string): Promise<CoreResult> {
  if (!isUuid(tradeId)) return { success: false, message: "Invalid trade" };
  const { error } = await supabase.from("trades").delete().eq("id", tradeId).eq("user_id", userId);
  if (error) return { success: false, message: error.message };
  return { success: true };
}

const finiteOrNull = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) && Math.abs(v) < 1e12 ? v : null;

/**
 * Import trade hasil parsing file MT4/MT5/CSV (lib/trade-import.ts) ke satu akun.
 * Data dari klien divalidasi ulang di sini. Trade dengan external_id yang sudah ada di akun itu dilewati.
 */
export async function importTradeRows(
  supabase: SupabaseClient,
  userId: string,
  accountId: string,
  rows: ImportRow[],
  t: T
): Promise<CoreResult<{ inserted: number; duplicates: number; invalid: number }>> {
  if (!isUuid(accountId) || !Array.isArray(rows) || rows.length > IMPORT_BATCH) {
    return { success: false, message: "Invalid request" };
  }
  if (!(await ownsAccount(supabase, userId, accountId))) return { success: false, message: "Invalid account" };

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
        user_id: userId,
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
    const { data, error } = await supabase.from("trades").select("external_id").eq("account_id", accountId).in("external_id", ids);
    if (error) {
      const missingColumn = /external_id|column|schema cache/i.test(error.message);
      return {
        success: false,
        message: missingColumn ? "Database belum diperbarui. Admin perlu menjalankan supabase/discipline-import.sql." : error.message,
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
  const riskCtx = toInsert.some((v) => v.trade_date === today) ? await loadRiskContext(supabase, userId, accountId) : null;

  if (toInsert.length > 0) {
    const { error } = await supabase.from("trades").insert(toInsert);
    if (error) return { success: false, message: error.message };
  }

  if (riskCtx) {
    const now = Date.now();
    await notifyRiskLimit(
      userId,
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

  return { success: true, inserted: toInsert.length, duplicates, invalid };
}

/** Simpan aturan risiko & target satu akun. Field kosong = aturan/target tidak dipakai. */
export async function updateAccountRulesCore(
  supabase: SupabaseClient,
  userId: string,
  accountId: string,
  get: FieldGetter,
  t: T
): Promise<CoreResult> {
  function num(field: string, max: number, integer = false): number | null | "invalid" {
    const raw = asText(get(field)).trim().replace(",", ".");
    if (raw === "") return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0 || n > max || (integer && !Number.isInteger(n))) return "invalid";
    return n;
  }

  const values = {
    max_daily_loss_pct: num("max_daily_loss_pct", 100),
    max_trades_per_day: num("max_trades_per_day", 100, true),
    max_consecutive_losses: num("max_consecutive_losses", 50, true),
    monthly_profit_target: num("monthly_profit_target", 1_000_000_000),
    target_win_rate: num("target_win_rate", 100),
  };
  if (Object.values(values).some((v) => v === "invalid")) {
    return { success: false, message: t("Ada angka yang tidak valid. Isi angka lebih dari 0, atau kosongkan.") };
  }

  const { error } = await supabase.from("trading_accounts").update(values).eq("id", accountId).eq("user_id", userId);
  if (error) {
    // Kolom belum ada = SQL supabase/discipline-import.sql belum dijalankan.
    const missingColumn = /column|schema cache/i.test(error.message);
    return {
      success: false,
      message: missingColumn ? t("Database belum diperbarui. Admin perlu menjalankan supabase/discipline-import.sql.") : error.message,
    };
  }
  return { success: true };
}

/** Maksimal akun journaling per user. */
export const MAX_ACCOUNTS = 5;

/** Buat akun journaling baru (maks 5 per user). */
export async function createAccountCore(
  supabase: SupabaseClient,
  userId: string,
  get: FieldGetter,
  t: T
): Promise<CoreResult<{ id: string | null }>> {
  const { count } = await supabase
    .from("trading_accounts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if ((count ?? 0) >= MAX_ACCOUNTS) return { success: false, message: t("Maksimal 5 akun journaling per user.") };

  const name = asText(get("name")).trim().slice(0, 60);
  const initialBalance = Number(asText(get("initial_balance")).trim().replace(",", ".") || 0);
  const currency = asText(get("currency")).toUpperCase() === "IDR" ? "IDR" : "USD";

  if (!name) return { success: false, message: t("Nama akun tidak boleh kosong.") };
  if (!Number.isFinite(initialBalance) || Math.abs(initialBalance) > 1_000_000_000) {
    return { success: false, message: t("Saldo awal tidak valid.") };
  }

  const { data, error } = await supabase
    .from("trading_accounts")
    .insert({ user_id: userId, name, initial_balance: initialBalance, currency })
    .select("id")
    .maybeSingle();
  if (error) return { success: false, message: error.message };
  return { success: true, id: (data?.id as string | undefined) ?? null };
}

/** Hapus akun journaling milik user (minimal harus tersisa 1 akun). */
export async function deleteAccountCore(
  supabase: SupabaseClient,
  userId: string,
  accountId: string,
  t: T
): Promise<CoreResult> {
  const { count } = await supabase
    .from("trading_accounts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if ((count ?? 0) <= 1) return { success: false, message: t("Minimal harus ada 1 akun journaling.") };

  const { error } = await supabase.from("trading_accounts").delete().eq("id", accountId).eq("user_id", userId);
  if (error) return { success: false, message: error.message };
  return { success: true };
}
