import { createClient } from "@/lib/supabase/server";
import { getEconomicCalendarRange } from "@/lib/economic-calendar";
import { calendarEventKey, getManualActuals } from "@/lib/calendar-actuals";
import { CalendarActualsTable, type ActualRow } from "@/components/admin/CalendarActualsTable";
import { getT } from "@/lib/i18n/server";

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function AdminCalendarActualsPage() {
  const { t } = await getT();
  const supabase = await createClient();
  const [events, saved] = await Promise.all([getEconomicCalendarRange(), getManualActuals(supabase)]);

  const now = Date.now();
  const rows: ActualRow[] = events
    .filter((e) => (e.impact === "HIGH" || e.impact === "MEDIUM") && new Date(e.dateISO).getTime() >= now - 4 * DAY_MS && new Date(e.dateISO).getTime() <= now + DAY_MS)
    .map((e) => ({
      key: calendarEventKey(e),
      dateISO: e.dateISO,
      currency: e.currency,
      impact: e.impact as "HIGH" | "MEDIUM",
      title: e.title,
      forecast: e.forecast,
      previous: e.previous,
      actual: saved.get(calendarEventKey(e)) ?? "",
    }))
    // yang sudah rilis tapi Actual-nya kosong tampil paling atas, lalu urut dari yang terbaru
    .sort((a, b) => {
      const pa = new Date(a.dateISO).getTime() <= now && !a.actual ? 0 : 1;
      const pb = new Date(b.dateISO).getTime() <= now && !b.actual ? 0 : 1;
      return pa - pb || new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime();
    });

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">{t("Actual Berita")}</h1>
        <p className="text-body-sm text-text-secondary">
          {t("Feed Forex Factory tidak menyediakan nilai Actual. Isi di sini setelah berita rilis, dan langsung tampil di halaman Economic News member.")}
        </p>
      </div>

      <CalendarActualsTable rows={rows} />
    </main>
  );
}
