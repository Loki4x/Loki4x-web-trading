// Push notification saat aturan risiko harian baru saja tercapai (aman/hampir -> tercapai).

import type { SupabaseClient } from "@supabase/supabase-js";
import { computeDiscipline, todayWib, type DisciplineTrade, type RuleStatus } from "@/lib/discipline";
import { sendPushToUsers } from "@/lib/push-send";
import type { PushPayload } from "@/lib/web-push";
import type { TradingAccount } from "@/lib/types";

type T = (key: string, vars?: Record<string, string | number>) => string;

export type RiskTrade = DisciplineTrade & { id: string };

export interface RiskContext {
  account: TradingAccount;
  trades: RiskTrade[];
}

const hasRules = (a: TradingAccount) =>
  [a.max_daily_loss_pct, a.max_trades_per_day, a.max_consecutive_losses].some((v) => Number(v) > 0);

/**
 * Ambil akun + trade-nya sebelum perubahan. null kalau akun tidak punya aturan risiko
 * (tidak perlu dicek sama sekali) atau kalau terjadi error (notifikasi tidak boleh menggagalkan simpan trade).
 */
export async function loadRiskContext(supabase: SupabaseClient, userId: string, accountId: string): Promise<RiskContext | null> {
  try {
    const { data: account } = await supabase
      .from("trading_accounts")
      .select("*")
      .eq("id", accountId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!account || !hasRules(account as TradingAccount)) return null;
    const { data: trades, error } = await supabase
      .from("trades")
      .select("id, trade_date, pnl, status, followed_plan, created_at")
      .eq("user_id", userId)
      .eq("account_id", accountId);
    if (error) return null;
    return { account: account as TradingAccount, trades: (trades ?? []) as RiskTrade[] };
  } catch {
    return null;
  }
}

function ruleText(r: RuleStatus, t: T): string {
  switch (r.key) {
    case "daily_loss":
      return t("rugi hari ini {x}% (batas {y}%)", { x: r.current.toFixed(1), y: r.limit });
    case "trades_per_day":
      return t("{n} trade hari ini (batas {m})", { n: r.current, m: r.limit });
    case "consecutive_losses":
      return t("{n} loss beruntun (batas {m})", { n: r.current, m: r.limit });
  }
}

/**
 * Isi push kalau ada aturan yang BARU tercapai karena perubahan ini; null kalau tidak.
 * Hanya melihat hari ini (WIB), jadi mencatat trade lama tidak memicu notifikasi.
 */
export function riskAlertPayload(
  account: TradingAccount,
  before: DisciplineTrade[],
  after: DisciplineTrade[],
  t: T,
  today: string = todayWib()
): PushPayload | null {
  const prev = computeDiscipline(account, before, today);
  const next = computeDiscipline(account, after, today);
  const wasBreached = new Set(prev.rules.filter((r) => r.level === "breached").map((r) => r.key));
  const newlyBreached = next.rules.filter((r) => r.level === "breached" && !wasBreached.has(r.key));
  if (newlyBreached.length === 0) return null;

  const details = newlyBreached.map((r) => ruleText(r, t)).join(", ");
  return {
    title: t("⛔ Batas risiko hari ini tercapai"),
    body: t("{account}: {details}. Saatnya berhenti trading dan lanjut besok.", { account: account.name, details }),
    url: "/trades",
    tag: `risk-${account.id}-${today}`,
  };
}

/** Bandingkan sebelum/sesudah lalu kirim push kalau perlu. Tidak pernah melempar error. */
export async function notifyRiskLimit(
  userId: string,
  ctx: RiskContext | null,
  after: DisciplineTrade[],
  t: T
): Promise<void> {
  if (!ctx) return;
  try {
    const payload = riskAlertPayload(ctx.account, ctx.trades, after, t);
    if (payload) await sendPushToUsers([{ userId, payload }], { urgency: "high", ttl: 6 * 3600 });
  } catch (err) {
    console.error("[risk-alert] error:", err);
  }
}
