import { SITE_URL } from "@/lib/site-url";
import { createServiceClient } from "@/lib/supabase/service";
import { sendEmailBatch } from "@/lib/email";
import { claimMarker } from "@/lib/cron-marker";
import { fetchRecipients, tierAtLeast, type Recipient } from "@/lib/recipients";
import { computeSignalStats } from "@/lib/signal-metrics";
import { translate, type Locale } from "@/lib/i18n/dictionary";
import type { Signal } from "@/lib/types";

type Vars = Record<string, string | number>;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

interface TradeRow {
  user_id: string;
  account_id: string | null;
  symbol: string;
  pnl: number | null;
}

interface TradeSummary {
  count: number;
  wins: number;
  pnlByCurrency: Record<string, number>;
  best: { symbol: string; pnl: number; currency: string } | null;
  worst: { symbol: string; pnl: number; currency: string } | null;
}

async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

function isoWeekKey(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function money(locale: Locale, currency: string, value: number): string {
  try {
    return new Intl.NumberFormat(locale === "en" ? "en-US" : "id-ID", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "IDR" ? 0 : 2,
      signDisplay: "exceptZero",
    }).format(value);
  } catch {
    return `${value > 0 ? "+" : ""}${value.toFixed(2)} ${currency}`;
  }
}

const signed = (n: number, digits = 1) => `${n > 0 ? "+" : ""}${n.toFixed(digits)}`;

function row(label: string, value: string, color = "#ffffff") {
  return `<tr><td style="padding:6px 0;color:#8b90a0;font-size:13px;">${label}</td><td style="padding:6px 0;color:${color};font-size:14px;font-weight:600;text-align:right;">${value}</td></tr>`;
}
const section = (title: string, rows: string) =>
  `<h3 style="color:#ffffff;font-size:15px;margin:24px 0 4px;">${esc(title)}</h3><table style="width:100%;border-collapse:collapse;">${rows}</table>`;
const pnlColor = (n: number) => (n > 0 ? "#2fbf8f" : n < 0 ? "#ef5b5b" : "#ffffff");

function buildEmail(
  recipient: Recipient,
  trades: TradeSummary | null,
  signals: ReturnType<typeof computeSignalStats> | null,
  signalsClosed: number
) {
  const locale = recipient.locale;
  const t = (k: string, v?: Vars) => translate(locale, k, v);
  let body = "";

  if (trades) {
    const winRate = trades.count > 0 ? (trades.wins / trades.count) * 100 : 0;
    let rows = row(t("Trade ditutup"), String(trades.count)) + row("Win rate", `${winRate.toFixed(0)}%`);
    for (const [cur, total] of Object.entries(trades.pnlByCurrency)) {
      rows += row(`${t("Net P/L")} (${cur})`, money(locale, cur, total), pnlColor(total));
    }
    if (trades.best && trades.best.pnl > 0) rows += row(t("Trade terbaik"), `${esc(trades.best.symbol)} ${money(locale, trades.best.currency, trades.best.pnl)}`, "#2fbf8f");
    if (trades.worst && trades.worst.pnl < 0)
      rows += row(t("Trade terburuk"), `${esc(trades.worst.symbol)} ${money(locale, trades.worst.currency, trades.worst.pnl)}`, "#ef5b5b");
    body += section(t("Journal Trading Kamu"), rows);
  }

  if (signals) {
    let rows = row(t("Jumlah sinyal ditutup"), String(signalsClosed));
    rows += row("Win / Loss", `${signals.wins} / ${signals.losses}`);
    rows += row("Win rate", `${signals.winRate.toFixed(0)}%`);
    rows += row(t("signals.pipsEarned"), `${signed(signals.totalPips)} pips`, pnlColor(signals.totalPips));
    rows += row(t("signals.pipsProfit"), `${signed(signals.profitPips)} pips`, "#2fbf8f");
    rows += row(t("signals.pipsLoss"), `${signals.lossPips > 0 ? "-" : ""}${signals.lossPips.toFixed(1)} pips`, "#ef5b5b");
    rows += row(t("signals.chart.growth"), `${signed(signals.totalGrowthPercent, 2)}%`, pnlColor(signals.totalGrowthPercent));
    body += section(t("Sinyal Minggu Ini"), rows);
  }

  const buttons: string[] = [];
  if (trades) buttons.push(`<a href="${SITE_URL}/reports" style="display:inline-block;background:#5b7be0;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:10px 18px;border-radius:8px;margin-right:8px;">${t("Lihat Laporan")}</a>`);
  if (signals) buttons.push(`<a href="${SITE_URL}/signals" style="display:inline-block;background:#5b7be0;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:10px 18px;border-radius:8px;">${t("Lihat Sinyal")}</a>`);

  const greeting = recipient.name ? t("Halo, {name}!", { name: esc(recipient.name) }) : t("Halo!");
  const html = `
    <div style="background-color:#0d0f14; padding:40px 20px; font-family:Arial, sans-serif;">
      <div style="max-width:480px; margin:0 auto; background-color:#161920; border-radius:12px; padding:32px; border:1px solid #2a2e38;">
        <p style="font-size:20px; font-weight:800; color:#ffffff;">4X COMUNITY</p>
        <h2 style="color:#ffffff; font-size:18px;">${t("Ringkasan Mingguan Kamu")}</h2>
        <p style="color:#c5c9d3; font-size:14px;">${greeting} ${t("Ini rangkuman 7 hari terakhir.")}</p>
        ${body}
        <p style="margin:24px 0 0;">${buttons.join("")}</p>
        <p style="color:#6b7080;font-size:12px;margin-top:24px;">${t("Kamu menerima email ini karena laporan mingguan aktif. Matikan di Settings → Notifikasi.")}</p>
      </div>
    </div>`;
  return { subject: t("📊 Ringkasan mingguan trading kamu"), html };
}

/**
 * Kirim ringkasan 7 hari terakhir: journal trading (semua tier, kalau ada trade) dan
 * rekap sinyal (hanya VIP/Membership aktif). User tanpa data tidak dikirimi email.
 */
export async function sendWeeklyReports(
  now = new Date(),
  opts: { force?: boolean; dryRun?: boolean } = {}
): Promise<{ week: string; recipients: number; sent: number; skipped?: string }> {
  const service = createServiceClient();
  const week = isoWeekKey(now);

  if (!opts.dryRun && !opts.force && !(await claimMarker(service, `weekly:${week}`))) {
    return { week, recipients: 0, sent: 0, skipped: "sudah dikirim untuk minggu ini" };
  }

  const since = new Date(now.getTime() - WEEK_MS).toISOString();
  const recipients = await fetchRecipients(service, "notify_weekly", { requireEmail: true });

  // ---- trades 7 hari terakhir (closed, ada pnl)
  const tradeRows = await fetchAll<TradeRow>((from, to) =>
    service
      .from("trades")
      .select("user_id, account_id, symbol, pnl")
      .eq("status", "CLOSED")
      .not("pnl", "is", null)
      .gte("trade_date", since)
      .order("id")
      .range(from, to)
  );
  const accountRows = tradeRows.length
    ? await fetchAll<{ id: string; currency: string }>((from, to) =>
        service.from("trading_accounts").select("id, currency").order("id").range(from, to)
      )
    : [];
  const currencyOf = new Map(accountRows.map((a) => [a.id, a.currency]));

  const tradesByUser = new Map<string, TradeSummary>();
  for (const tr of tradeRows) {
    const pnl = Number(tr.pnl);
    if (!Number.isFinite(pnl)) continue;
    const currency = (tr.account_id && currencyOf.get(tr.account_id)) || "USD";
    const s =
      tradesByUser.get(tr.user_id) ??
      ({ count: 0, wins: 0, pnlByCurrency: {}, best: null, worst: null } as TradeSummary);
    s.count++;
    if (pnl > 0) s.wins++;
    s.pnlByCurrency[currency] = (s.pnlByCurrency[currency] ?? 0) + pnl;
    if (!s.best || pnl > s.best.pnl) s.best = { symbol: tr.symbol, pnl, currency };
    if (!s.worst || pnl < s.worst.pnl) s.worst = { symbol: tr.symbol, pnl, currency };
    tradesByUser.set(tr.user_id, s);
  }

  // ---- sinyal yang ditutup 7 hari terakhir
  const { data: signalRows, error: signalError } = await service
    .from("signals")
    .select("id, symbol, side, entry_price, current_price, current_price_at, take_profit, stop_loss, status, result_pips, risk_percent, posted_at, closed_at")
    .in("status", ["TP", "SL", "PARTIAL"])
    .gte("closed_at", since);
  if (signalError) console.error("[weekly-report] gagal ambil sinyal:", signalError.message);
  const weekSignals = (signalRows ?? []) as unknown as Signal[];
  const signalStats = weekSignals.length > 0 ? computeSignalStats(weekSignals) : null;

  const messages: { to: string; subject: string; html: string }[] = [];
  for (const r of recipients) {
    if (!r.email) continue;
    const trades = tradesByUser.get(r.id) ?? null;
    const signals = signalStats && tierAtLeast(r.tier, "VIP") ? signalStats : null;
    if (!trades && !signals) continue; // tidak ada yang dilaporkan
    const mail = buildEmail(r, trades, signals, weekSignals.length);
    messages.push({ to: r.email, ...mail });
  }

  if (!opts.dryRun) await sendEmailBatch(messages);
  return { week, recipients: recipients.length, sent: opts.dryRun ? 0 : messages.length };
}
