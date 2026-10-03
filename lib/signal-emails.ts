import { createServiceClient } from "@/lib/supabase/service";
import { sendEmailBatch } from "@/lib/email";
import { translate, type Locale } from "@/lib/i18n/dictionary";

type Vars = Record<string, string | number>;

export interface SignalEmailData {
  symbol: string;
  side: string;
  entry_price: number;
  take_profit: number | null;
  stop_loss: number | null;
  notes?: string | null;
  status?: string;
  result_pips?: number | null;
}

export type SignalEmailEvent =
  | { kind: "NEW"; signal: SignalEmailData }
  | { kind: "CLOSED"; signal: SignalEmailData }
  | { kind: "UPDATE"; signal: SignalEmailData; updateType: string; message: string | null; price: number | null };

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://4xcomunity.my.id").replace(/\/$/, "");

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const num = (n: number | null | undefined) => (n === null || n === undefined ? "—" : String(n));

const UPDATE_LABEL: Record<string, string> = {
  SL_TO_BE: "SL digeser ke BE",
  PARTIAL_CLOSE: "Partial close",
  MOVE_SL: "Geser Stop Loss",
  MOVE_TP: "Geser Take Profit",
  NOTE: "Catatan",
};

const STATUS_LABEL: Record<string, string> = {
  TP: "Take Profit tercapai",
  SL: "Stop Loss kena",
  PARTIAL: "Partial close",
  CANCEL: "Sinyal dibatalkan",
  MISS: "Sinyal terlewat (tidak entry)",
};

function row(label: string, value: string) {
  return `<tr><td style="padding:6px 0;color:#8b90a0;font-size:13px;">${label}</td><td style="padding:6px 0;color:#ffffff;font-size:14px;font-weight:600;text-align:right;">${value}</td></tr>`;
}

function build(event: SignalEmailEvent, locale: Locale): { subject: string; html: string } {
  const t = (key: string, vars?: Vars) => translate(locale, key, vars);
  const sig = event.signal;
  const pair = `${sig.symbol} ${sig.side}`;
  let subject = "";
  let heading = "";
  let rows = "";
  let extra = "";

  if (event.kind === "NEW") {
    subject = t("🔔 Sinyal baru: {pair}", { pair });
    heading = t("Sinyal baru: {pair}", { pair });
    rows = row("Entry", num(sig.entry_price)) + row("Take Profit", num(sig.take_profit)) + row("Stop Loss", num(sig.stop_loss));
    if (sig.notes) extra = `<p style="color:#c5c9d3;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(sig.notes)}</p>`;
  } else if (event.kind === "UPDATE") {
    const label = t(UPDATE_LABEL[event.updateType] ?? "Catatan");
    subject = t("📌 Update sinyal {pair}: {label}", { pair, label });
    heading = t("Update sinyal {pair}", { pair });
    rows = row(t("Update"), escapeHtml(label)) + (event.price !== null ? row(t("Harga"), num(event.price)) : "");
    if (event.message) extra = `<p style="color:#c5c9d3;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(event.message)}</p>`;
  } else {
    const label = t(STATUS_LABEL[sig.status ?? ""] ?? "Sinyal ditutup");
    const icon = sig.status === "TP" ? "✅" : sig.status === "SL" ? "❌" : "ℹ️";
    subject = `${icon} ${pair} — ${label}`;
    heading = `${pair} — ${label}`;
    rows = row("Entry", num(sig.entry_price));
    if (sig.result_pips !== null && sig.result_pips !== undefined) rows += row("Pips", `${sig.result_pips > 0 ? "+" : ""}${sig.result_pips}`);
  }

  const html = `
    <div style="background-color:#0d0f14; padding:40px 20px; font-family:Arial, sans-serif;">
      <div style="max-width:480px; margin:0 auto; background-color:#161920; border-radius:12px; padding:32px; border:1px solid #2a2e38;">
        <p style="font-size:20px; font-weight:800; color:#ffffff;">4X COMUNITY</p>
        <h2 style="color:#ffffff; font-size:18px;">${escapeHtml(heading)}</h2>
        <table style="width:100%; border-collapse:collapse; margin:12px 0;">${rows}</table>
        ${extra}
        <p style="margin:24px 0 0;"><a href="${SITE_URL}/signals" style="display:inline-block;background:#5b7be0;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:10px 18px;border-radius:8px;">${t("Lihat Sinyal")}</a></p>
        <p style="color:#6b7080;font-size:12px;margin-top:24px;">${t("Kamu menerima email ini karena notifikasi sinyal aktif. Matikan di Settings → Notifikasi.")}</p>
      </div>
    </div>`;
  return { subject, html };
}

/**
 * Kirim email sinyal ke member yang: VIP/Membership AKTIF, notify_signals = true,
 * tidak disuspend, dan punya email. Tidak pernah melempar error (jangan sampai
 * gagal kirim email membuat posting sinyal gagal).
 */
export async function sendSignalEmails(event: SignalEmailEvent): Promise<{ sent: number }> {
  try {
    const service = createServiceClient();
    const now = Date.now();
    const recipients: { email: string; locale: Locale }[] = [];

    for (let from = 0; ; from += 1000) {
      const { data, error } = await service
        .from("profiles")
        .select("email, language, tier, vip_expires_at")
        .eq("notify_signals", true)
        .in("tier", ["VIP", "MEMBERSHIP"])
        .or("is_suspended.is.null,is_suspended.eq.false")
        .not("email", "is", null)
        .range(from, from + 999);
      if (error) {
        console.error("[signal-emails] gagal ambil penerima:", error.message);
        break;
      }
      for (const p of data ?? []) {
        const active = !p.vip_expires_at || new Date(p.vip_expires_at).getTime() > now;
        if (active && p.email) recipients.push({ email: p.email, locale: p.language === "en" ? "en" : "id" });
      }
      if (!data || data.length < 1000) break;
    }

    if (recipients.length === 0) return { sent: 0 };

    const built: Record<Locale, { subject: string; html: string }> = {
      id: build(event, "id"),
      en: build(event, "en"),
    };
    await sendEmailBatch(recipients.map((r) => ({ to: r.email, ...built[r.locale] })));
    return { sent: recipients.length };
  } catch (err) {
    console.error("[signal-emails] error:", err);
    return { sent: 0 };
  }
}
