"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserTier, hasAccess } from "@/lib/tier";
import { getT } from "@/lib/i18n/server";
import { rateLimit } from "@/lib/rate-limit";
import { isUuid } from "@/lib/validation";
import { buildJournalInsights } from "@/lib/journal-insights";
import { computeDiscipline } from "@/lib/discipline";
import { AiReviewError, generateJournalReview, isAiReviewConfigured, type JournalReview } from "@/lib/ai-review";
import type { Trade, TradingAccount } from "@/lib/types";

/** Minimal trade tertutup supaya review punya cukup data. */
const MIN_CLOSED_TRADES = 10;
/** Batas review per user per hari (biaya API). */
const DAILY_LIMIT = 3;

export async function reviewJournal(
  accountId: string
): Promise<{ success: true; review: JournalReview; createdAt: string; tradeCount: number } | { success: false; message: string }> {
  const { t, locale } = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Not authenticated" };
  if (!hasAccess(await getCurrentUserTier(), "MEMBERSHIP")) {
    return { success: false, message: t("Fitur ini khusus member Membership.") };
  }
  if (!isUuid(accountId)) return { success: false, message: "Invalid account" };
  if (!isAiReviewConfigured()) {
    return { success: false, message: t("Fitur review AI belum diaktifkan oleh admin.") };
  }

  const { data: account } = await supabase
    .from("trading_accounts")
    .select("*")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!account) return { success: false, message: "Invalid account" };

  const { data: tradeRows } = await supabase
    .from("trades")
    .select("*")
    .eq("user_id", user.id)
    .eq("account_id", accountId)
    .order("trade_date", { ascending: true });
  const trades = (tradeRows ?? []) as Trade[];
  const insights = buildJournalInsights(trades);
  if (insights.overall.closedTrades < MIN_CLOSED_TRADES) {
    return {
      success: false,
      message: t("Butuh minimal {min} trade yang sudah ditutup untuk review AI (sekarang {n}).", {
        min: MIN_CLOSED_TRADES,
        n: insights.overall.closedTrades,
      }),
    };
  }

  // Limit dicek setelah validasi supaya percobaan yang ditolak tidak menghabiskan jatah.
  if (!(await rateLimit(`ai-review:${user.id}`, DAILY_LIMIT, 24 * 60 * 60))) {
    return { success: false, message: t("Batas review AI hari ini sudah habis ({n}x per hari). Coba lagi besok.", { n: DAILY_LIMIT }) };
  }

  try {
    const review = await generateJournalReview({
      insights,
      discipline: computeDiscipline(account as TradingAccount, trades),
      currency: (account as TradingAccount).currency,
      locale,
    });
    return { success: true, review, createdAt: new Date().toISOString(), tradeCount: insights.overall.closedTrades };
  } catch (err) {
    const code = err instanceof AiReviewError ? err.message : "api";
    const messages: Record<string, string> = {
      rate_limited: t("Layanan AI sedang sibuk. Coba lagi beberapa menit lagi."),
      refusal: t("AI tidak bisa memproses jurnal ini. Coba lagi nanti."),
      auth: t("Fitur review AI belum diaktifkan oleh admin."),
      api: t("Gagal membuat review AI. Coba lagi nanti."),
    };
    return { success: false, message: messages[code] ?? messages.api };
  }
}
