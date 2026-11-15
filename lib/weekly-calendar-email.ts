import { SITE_URL } from "@/lib/site-url";
import { createServiceClient } from "@/lib/supabase/service";
import { sendEmailBatch } from "@/lib/email";
import { claimMarker } from "@/lib/cron-marker";
import { fetchRecipients, tierAtLeast, type Recipient } from "@/lib/recipients";
import { getEconomicCalendarRange, type CalendarEvent } from "@/lib/economic-calendar";
import { translate, type Locale } from "@/lib/i18n/dictionary";

// Email kalender ekonomi mingguan: semua berita HIGH impact Senin–Jumat minggu ini (WIB),
// dikirim Senin pagi ke member Membership yang mengaktifkan notifikasi berita.

type Vars = Record<string, string | number>;

const WIB_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const FLAGS: Record<string, string> = {
  USD: "🇺🇸",
  EUR: "🇪🇺",
  GBP: "🇬🇧",
  JPY: "🇯🇵",
  AUD: "🇦🇺",
  NZD: "🇳🇿",
  CAD: "🇨🇦",
  CHF: "🇨🇭",
  CNY: "🇨🇳",
};

/**
 * Rentang minggu trading (WIB) yang memuat `now`: Senin 00:00 sampai Sabtu 05:00 WIB
 * (berita AS hari Jumat malam waktu New York jatuh di Sabtu dini hari WIB).
 */
export function tradingWeekWib(now: Date): { start: Date; end: Date; key: string } {
  const wib = new Date(now.getTime() + WIB_MS);
  const dow = wib.getUTCDay(); // 0 = Minggu
  // Minggu dianggap menjelang minggu depan, hari lain mundur ke Senin minggu ini.
  const daysToMonday = dow === 0 ? 1 : 1 - dow;
  const mondayWib = Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate() + daysToMonday);
  const start = new Date(mondayWib - WIB_MS);
  const end = new Date(start.getTime() + 5 * DAY_MS + 5 * 60 * 60 * 1000);
  return { start, end, key: new Date(mondayWib).toISOString().slice(0, 10) };
}

export function highImpactEventsForWeek(events: CalendarEvent[], week: { start: Date; end: Date }): CalendarEvent[] {
  return events
    .filter((e) => {
      const t = new Date(e.dateISO).getTime();
      return e.impact === "HIGH" && t >= week.start.getTime() && t < week.end.getTime();
    })
    .sort((a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime());
}

// Jam selalu "HH:MM" (pakai titik dua), sama seperti di web.
const timeFmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta" });

function fmt(locale: Locale, d: Date, opts: Intl.DateTimeFormatOptions) {
  return d.toLocaleString(locale === "en" ? "en-US" : "id-ID", { timeZone: "Asia/Jakarta", ...opts });
}

export function buildCalendarEmail(recipient: Pick<Recipient, "name" | "locale">, events: CalendarEvent[], week: { start: Date; end: Date }) {
  const locale = recipient.locale;
  const t = (k: string, v?: Vars) => translate(locale, k, v);
  const lastDay = new Date(week.start.getTime() + 4 * DAY_MS);
  const range = `${fmt(locale, week.start, { day: "numeric", month: "long" })} – ${fmt(locale, lastDay, { day: "numeric", month: "long", year: "numeric" })}`;

  // Kelompokkan per hari (WIB).
  const byDay = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const key = fmt(locale, new Date(e.dateISO), { weekday: "long", day: "numeric", month: "short" });
    byDay.set(key, [...(byDay.get(key) ?? []), e]);
  }

  let days = "";
  for (const [day, list] of byDay) {
    let rows = "";
    for (const e of list) {
      const time = timeFmt.format(new Date(e.dateISO));
      const meta = [e.forecast && `${t("Forecast")}: ${esc(e.forecast)}`, e.previous && `${t("Previous")}: ${esc(e.previous)}`]
        .filter(Boolean)
        .join(" · ");
      rows += `<tr>
        <td style="width:52px;padding:8px 8px 8px 0;color:#c5c9d3;font-size:13px;white-space:nowrap;vertical-align:top;">${time}</td>
        <td style="width:72px;padding:8px 8px;color:#8b90a0;font-size:13px;white-space:nowrap;vertical-align:top;">${FLAGS[e.currency] ?? "🌐"} ${esc(e.currency)}</td>
        <td style="padding:8px 0 8px 8px;vertical-align:top;"><span style="color:#ffffff;font-size:14px;font-weight:600;">${esc(e.title)}</span>${
          meta ? `<br><span style="color:#6b7080;font-size:12px;">${meta}</span>` : ""
        }</td>
      </tr>`;
    }
    days += `<h3 style="color:#ffffff;font-size:14px;margin:22px 0 2px;padding-bottom:6px;border-bottom:1px solid #2a2e38;">${esc(day)}</h3>
      <table style="width:100%;border-collapse:collapse;table-layout:fixed;">${rows}</table>`;
  }

  const greeting = recipient.name ? t("Halo, {name}!", { name: esc(recipient.name) }) : t("Halo!");
  const html = `
    <div style="background-color:#0d0f14; padding:40px 20px; font-family:Arial, sans-serif;">
      <div style="max-width:520px; margin:0 auto; background-color:#161920; border-radius:12px; padding:32px; border:1px solid #2a2e38;">
        <p style="font-size:20px; font-weight:800; color:#ffffff;">Loki4x Academy</p>
        <h2 style="color:#ffffff; font-size:18px;">${t("Berita High Impact Minggu Ini")}</h2>
        <p style="color:#c5c9d3; font-size:14px; line-height:1.6;">${greeting} ${t(
          "Berikut {n} berita high impact untuk {range}. Semua jam dalam WIB. Berita ini bisa membuat market sangat volatil, jadi atur risiko dan hindari entry tepat saat rilis.",
          { n: events.length, range }
        )}</p>
        ${days}
        <p style="margin:28px 0 0;"><a href="${SITE_URL}/news" style="display:inline-block;background:#5b7be0;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:10px 18px;border-radius:8px;">${t(
          "Lihat Kalender Lengkap"
        )}</a></p>
        <p style="color:#6b7080;font-size:12px;margin-top:24px;">${t(
          "Jadwal bisa berubah, cek kalender di web sebelum trading. Kamu menerima email ini karena notifikasi berita aktif. Matikan di Settings → Notifikasi."
        )}</p>
      </div>
    </div>`;
  return { subject: t("📅 Berita high impact minggu ini ({range})", { range }), html };
}

/**
 * Kirim email kalender mingguan. Sekali per minggu (penanda cron), kecuali force.
 * Kalau feed kalender kosong/gagal, tidak ada yang dikirim dan penanda tidak diklaim,
 * jadi jadwal berikutnya bisa mencoba lagi.
 */
export async function sendWeeklyCalendarEmails(
  now = new Date(),
  opts: { force?: boolean; dryRun?: boolean } = {}
): Promise<{ week: string; events: number; recipients: number; sent: number; skipped?: string; previewHtml?: string }> {
  const week = tradingWeekWib(now);
  const events = highImpactEventsForWeek(await getEconomicCalendarRange(), week);
  if (events.length === 0) {
    return { week: week.key, events: 0, recipients: 0, sent: 0, skipped: "tidak ada berita high impact / feed kalender gagal" };
  }

  const service = createServiceClient();
  if (!opts.dryRun && !opts.force && !(await claimMarker(service, `news-weekly:${week.key}`))) {
    return { week: week.key, events: events.length, recipients: 0, sent: 0, skipped: "sudah dikirim untuk minggu ini" };
  }

  // Kalender ekonomi = fitur Membership, sama seperti pengingat berita.
  const recipients = (await fetchRecipients(service, "notify_news", { requireEmail: true })).filter((r) =>
    tierAtLeast(r.tier, "MEMBERSHIP")
  );
  const messages = recipients
    .filter((r) => r.email)
    .map((r) => ({ to: r.email as string, ...buildCalendarEmail(r, events, week) }));

  if (!opts.dryRun) await sendEmailBatch(messages);
  return {
    week: week.key,
    events: events.length,
    recipients: messages.length,
    sent: opts.dryRun ? 0 : messages.length,
    ...(opts.dryRun ? { previewHtml: buildCalendarEmail({ name: "Trader", locale: "id" }, events, week).html } : {}),
  };
}
