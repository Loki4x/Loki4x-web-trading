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

// Unofficial weekly export feed used by many EAs/indicators (no API key required).
// ForexFactory rate-limits this endpoint, so it's fetched with Next.js's fetch cache
// (revalidate below) rather than on every request.
const FEED_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json";

function normalizeImpact(raw: unknown): CalendarImpact {
  const value = String(raw ?? "").toLowerCase();
  if (value === "high") return "HIGH";
  if (value === "medium") return "MEDIUM";
  if (value === "low") return "LOW";
  return "HOLIDAY";
}

export async function getEconomicCalendar(): Promise<CalendarEvent[]> {
  try {
    const res = await fetch(FEED_URL, {
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
          id: `${dateISO}-${index}`,
          title,
          currency: String(record?.country ?? "").toUpperCase(),
          impact: normalizeImpact(record?.impact),
          dateISO,
          forecast: String(record?.forecast ?? "").trim(),
          previous: String(record?.previous ?? "").trim(),
          actual: String(record?.actual ?? "").trim(),
        };
      })
      .filter((event): event is CalendarEvent => event !== null)
      .sort((a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime());
  } catch {
    return [];
  }
}

