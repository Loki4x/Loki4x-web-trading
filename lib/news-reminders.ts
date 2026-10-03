import { createServiceClient } from "@/lib/supabase/service";
import { getEconomicCalendarRange } from "@/lib/economic-calendar";
import { claimMarker } from "@/lib/cron-marker";
import { fetchRecipients, tierAtLeast } from "@/lib/recipients";
import { translate, type Locale } from "@/lib/i18n/dictionary";

// Pengingat dikirim untuk berita yang mulai 5–20 menit lagi. Dengan cron tiap 5 menit,
// pengingat tiba kira-kira 15–20 menit sebelum rilis (bisa lebih mepet kalau jadwal GitHub/cron telat).
const MIN_LEAD_MS = 5 * 60_000;
const MAX_LEAD_MS = 20 * 60_000;
const MAX_LISTED = 4;

const timeFmt = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Jakarta",
});

export async function sendNewsReminders(now = new Date()) {
  const events = (await getEconomicCalendarRange()).filter((e) => {
    if (e.impact !== "HIGH") return false;
    const lead = new Date(e.dateISO).getTime() - now.getTime();
    return lead >= MIN_LEAD_MS && lead < MAX_LEAD_MS;
  });
  if (events.length === 0) return { slots: 0, notified: 0 };

  // Kelompokkan per waktu rilis: satu notifikasi per slot waktu, bukan per berita.
  const slots = new Map<string, typeof events>();
  for (const e of events) {
    const key = new Date(e.dateISO).toISOString();
    slots.set(key, [...(slots.get(key) ?? []), e]);
  }

  const service = createServiceClient();
  let recipients: Awaited<ReturnType<typeof fetchRecipients>> | null = null;
  let notified = 0;
  let slotCount = 0;

  for (const [slotIso, list] of Array.from(slots.entries()).sort()) {
    // Atomik: hanya satu run yang boleh mengirim untuk slot ini.
    if (!(await claimMarker(service, `news:${slotIso}`))) continue;
    slotCount++;

    // News page = fitur Membership, jadi pengingat hanya untuk Membership aktif.
    recipients ??= (await fetchRecipients(service, "notify_news")).filter((r) => tierAtLeast(r.tier, "MEMBERSHIP"));
    if (recipients.length === 0) continue;

    const minutes = Math.max(1, Math.round((new Date(slotIso).getTime() - now.getTime()) / 60_000));
    const time = timeFmt.format(new Date(slotIso));
    const shown = list.slice(0, MAX_LISTED).map((e) => `${e.currency} ${e.title}`);
    const extra = list.length - shown.length;

    const build = (locale: Locale) => {
      const t = (k: string, v?: Record<string, string | number>) => translate(locale, k, v);
      const names = shown.join(", ") + (extra > 0 ? t(" +{n} lainnya", { n: extra }) : "");
      return {
        title: t("⏰ Berita high-impact sebentar lagi"),
        message: t("Dalam {n} menit ({time} WIB): {names}", { n: minutes, time, names }),
      };
    };
    const text = { id: build("id"), en: build("en") };

    // type "ANNOUNCEMENT" dipakai supaya aman terhadap constraint tabel notifications.
    for (let i = 0; i < recipients.length; i += 500) {
      const rows = recipients.slice(i, i + 500).map((r) => ({
        user_id: r.id,
        type: "ANNOUNCEMENT",
        title: text[r.locale].title,
        message: text[r.locale].message,
      }));
      const { error } = await service.from("notifications").insert(rows);
      if (error) console.error("[news-reminders] gagal insert notifikasi:", error.message);
      else notified += rows.length;
    }
  }
  return { slots: slotCount, notified };
}
