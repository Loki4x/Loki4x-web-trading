export type CalendarImpact = "HIGH" | "MEDIUM" | "LOW" | "HOLIDAY";

export interface CalendarEvent {
  id: string;
  title: string;
  currency: string;
  impact: CalendarImpact;
  dateISO: string;
  forecast: string;
  previous: string;
  actual: string;
}

type WeekPeriod = "lastweek" | "thisweek" | "nextweek";

// Unofficial weekly export feed used by many EAs/indicators (no API key required).
// It only ever offers last/this/next week — there's no arbitrary date-range
// endpoint — so we fetch all three and merge them for a ~3-week browsable window.
const FEED_BASE_URL = "https://nfs.faireconomy.media/ff_calendar_";

function normalizeImpact(raw: unknown): CalendarImpact {
  const value = String(raw ?? "").toLowerCase();
  if (value === "high") return "HIGH";
  if (value === "medium") return "MEDIUM";
  if (value === "low") return "LOW";
  return "HOLIDAY";
}

async function fetchWeek(period: WeekPeriod): Promise<CalendarEvent[]> {
  try {
    const res = await fetch(`${FEED_BASE_URL}${period}.json`, {
      next: { revalidate: 300 }, // 5 minutes — keeps us well under FF's rate limit
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; Loki4xAcademy/1.0; +https://4xcomunity.my.id)",
      },
    });

    if (!res.ok) return [];

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("json")) return []; // FF returns an HTML "rate limited" page on abuse

    const raw = (await res.json()) as unknown;
    if (!Array.isArray(raw)) return [];

    return raw
      .map((item, index): CalendarEvent | null => {
        const record = item as Record<string, unknown>;
        const title = String(record?.title ?? "").trim();
        const dateISO = String(record?.date ?? "");
        if (!title || !dateISO || Number.isNaN(new Date(dateISO).getTime())) return null;

        return {
          id: `${period}-${dateISO}-${index}`,
          title,
          currency: String(record?.country ?? "").toUpperCase(),
          impact: normalizeImpact(record?.impact),
          dateISO,
          forecast: String(record?.forecast ?? "").trim(),
          previous: String(record?.previous ?? "").trim(),
          actual: String(record?.actual ?? "").trim(),
        };
      })
      .filter((event): event is CalendarEvent => event !== null);
  } catch {
    return [];
  }
}

/**
 * Fetches last/this/next week and merges them into one deduplicated, sorted
 * list, so the calendar page can offer a date picker instead of just "this week".
 */
export async function getEconomicCalendarRange(): Promise<CalendarEvent[]> {
  const [last, current, next] = await Promise.all([
    fetchWeek("lastweek"),
    fetchWeek("thisweek"),
    fetchWeek("nextweek"),
  ]);

  const seen = new Set<string>();
  const merged: CalendarEvent[] = [];
  for (const event of [...last, ...current, ...next]) {
    const key = `${event.dateISO}|${event.title}|${event.currency}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(event);
  }

  return merged.sort((a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime());
}
