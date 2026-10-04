import type { SupabaseClient } from "@supabase/supabase-js";
import type { CalendarEvent } from "@/lib/economic-calendar";

const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" });

/**
 * Kunci event untuk menyimpan Actual manual: tanggal (WIB) | mata uang | judul.
 * Sengaja tanpa jam, supaya tetap cocok kalau feed menggeser jam rilis beberapa menit.
 */
export function calendarEventKey(event: Pick<CalendarEvent, "dateISO" | "currency" | "title">): string {
  return `${dayFmt.format(new Date(event.dateISO))}|${event.currency}|${event.title}`;
}

export async function getManualActuals(supabase: SupabaseClient): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("calendar_actuals")
    .select("event_key, actual")
    .order("updated_at", { ascending: false })
    .limit(3000);
  if (error) {
    // Tabel belum dibuat / error: kalender tetap tampil, hanya tanpa Actual manual.
    console.error("[calendar-actuals]", error.message);
    return new Map();
  }
  return new Map((data ?? []).map((r) => [r.event_key as string, r.actual as string]));
}

/** Actual manual (kalau ada) menimpa nilai dari feed, yang biasanya kosong. */
export function applyManualActuals(events: CalendarEvent[], actuals: Map<string, string>): CalendarEvent[] {
  if (actuals.size === 0) return events;
  return events.map((e) => {
    const manual = actuals.get(calendarEventKey(e));
    return manual ? { ...e, actual: manual } : e;
  });
}
