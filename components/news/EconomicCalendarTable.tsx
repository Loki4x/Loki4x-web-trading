"use client";

import { useMemo, useState } from "react";
import { cx } from "@/lib/utils";
import type { CalendarEvent, CalendarImpact } from "@/lib/economic-calendar";

const IMPACT_LABEL: Record<CalendarImpact, string> = {
  HIGH: "Tinggi",
  MEDIUM: "Sedang",
  LOW: "Rendah",
  HOLIDAY: "Libur",
};

const IMPACT_STYLE: Record<CalendarImpact, string> = {
  HIGH: "bg-error-subtle text-error",
  MEDIUM: "bg-warning-subtle text-warning",
  LOW: "bg-info-subtle text-info",
  HOLIDAY: "bg-surface-2 text-text-muted",
};

const CURRENCY_FLAG: Record<string, string> = {
  USD: "🇺🇸",
  EUR: "🇪🇺",
  GBP: "🇬🇧",
  JPY: "🇯🇵",
  CHF: "🇨🇭",
  CAD: "🇨🇦",
  AUD: "🇦🇺",
  NZD: "🇳🇿",
  CNY: "🇨🇳",
  HKD: "🇭🇰",
  SGD: "🇸🇬",
  KRW: "🇰🇷",
  INR: "🇮🇳",
  BRL: "🇧🇷",
  MXN: "🇲🇽",
  NOK: "🇳🇴",
  SEK: "🇸🇪",
  ZAR: "🇿🇦",
};

type FilterKey = "ALL" | "HIGH" | "MEDIUM" | "LOW";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "ALL", label: "Semua" },
  { key: "HIGH", label: "Tinggi" },
  { key: "MEDIUM", label: "Sedang" },
  { key: "LOW", label: "Rendah" },
];

const dayFormatter = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "short",
  timeZone: "Asia/Jakarta",
});

const shortDayFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  timeZone: "Asia/Jakarta",
});

const timeFormatter = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Jakarta",
});

// yyyy-mm-dd key in WIB, used to group/filter events by local day (not UTC day)
const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" });

function toWIBDayKey(dateISO: string) {
  return dayKeyFormatter.format(new Date(dateISO));
}

export function EconomicCalendarTable({ events }: { events: CalendarEvent[] }) {
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [selectedDate, setSelectedDate] = useState<string>(""); // "" = semua tanggal, else yyyy-mm-dd (WIB)

  const availableDates = useMemo(() => {
    const keys = new Set(events.map((e) => toWIBDayKey(e.dateISO)));
    return Array.from(keys).sort();
  }, [events]);

  const minDate = availableDates[0];
  const maxDate = availableDates[availableDates.length - 1];

  const byDate = useMemo(
    () => (selectedDate ? events.filter((e) => toWIBDayKey(e.dateISO) === selectedDate) : events),
    [events, selectedDate]
  );

  const counts = useMemo(
    () => ({
      ALL: byDate.length,
      HIGH: byDate.filter((e) => e.impact === "HIGH").length,
      MEDIUM: byDate.filter((e) => e.impact === "MEDIUM").length,
      LOW: byDate.filter((e) => e.impact === "LOW").length,
    }),
    [byDate]
  );

  const groups = useMemo(() => {
    const filtered = filter === "ALL" ? byDate : byDate.filter((e) => e.impact === filter);
    const map = new Map<string, { label: string; items: CalendarEvent[] }>();
    for (const event of filtered) {
      const date = new Date(event.dateISO);
      const key = dayKeyFormatter.format(date);
      if (!map.has(key)) {
        map.set(key, { label: dayFormatter.format(date), items: [] });
      }
      map.get(key)!.items.push(event);
    }
    return Array.from(map.values());
  }, [byDate, filter]);

  return (
    <div className="card !p-0">
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
        <label htmlFor="calendar-date" className="text-body-sm font-medium text-text-secondary">
          Tanggal
        </label>
        <input
          id="calendar-date"
          type="date"
          value={selectedDate}
          min={minDate}
          max={maxDate}
          disabled={!minDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="input-field w-auto py-1.5 disabled:opacity-50"
        />
        {selectedDate && (
          <button
            type="button"
            onClick={() => setSelectedDate("")}
            className="text-body-sm text-primary underline-offset-2 hover:underline"
          >
            Tampilkan semua tanggal
          </button>
        )}
        {minDate && maxDate && (
          <span className="text-caption text-text-muted">
            Data tersedia {shortDayFormatter.format(new Date(minDate))} – {shortDayFormatter.format(new Date(maxDate))}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
        <span className="mr-1 text-body-sm font-medium text-text-secondary">Dampak</span>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cx(
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-body-sm font-medium transition-colors",
              filter === f.key
                ? "border-primary bg-primary-subtle text-primary"
                : "border-border text-text-secondary hover:bg-surface-hover"
            )}
          >
            {f.label}
            <span
              className={cx(
                "rounded-full px-1.5 text-caption",
                filter === f.key ? "bg-primary text-text-on-primary" : "bg-surface-2 text-text-muted"
              )}
            >
              {counts[f.key]}
            </span>
          </button>
        ))}
      </div>

      {events.length === 0 && (
        <p className="p-6 text-center text-body-sm text-text-muted">
          Data kalender sedang tidak bisa dimuat dari sumbernya. Coba refresh beberapa saat lagi.
        </p>
      )}

      {events.length > 0 && groups.length === 0 && (
        <p className="p-6 text-center text-body-sm text-text-muted">
          Tidak ada event pada tanggal/filter yang dipilih.
        </p>
      )}

      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {groups.length > 0 && (
            <div className="flex items-center gap-4 border-b border-border bg-surface-2 px-4 py-2 text-caption font-semibold uppercase tracking-wide text-text-muted">
              <span className="w-12 shrink-0">Jam</span>
              <span className="w-8 shrink-0" />
              <span className="w-12 shrink-0">Mata Uang</span>
              <span className="w-20 shrink-0">Dampak</span>
              <span className="flex-1">Event</span>
              <div className="flex w-72 shrink-0 justify-end gap-5">
                <span className="w-20 text-right">Forecast</span>
                <span className="w-20 text-right">Previous</span>
                <span className="w-20 text-right">Actual</span>
              </div>
            </div>
          )}

          {groups.map((group) => (
            <div key={group.label}>
              <div className="bg-surface-2 px-4 py-2 text-caption font-semibold uppercase tracking-wide text-text-secondary">
                {group.label}
              </div>
              <div className="divide-y divide-border">
                {group.items.map((event) => (
                  <div key={event.id} className="flex items-center gap-4 px-4 py-3">
                    <span className="w-12 shrink-0 font-mono text-body-sm text-text-secondary">
                      {timeFormatter.format(new Date(event.dateISO))}
                    </span>
                    <span className="w-8 shrink-0 text-center">{CURRENCY_FLAG[event.currency] ?? "🏳️"}</span>
                    <span className="w-12 shrink-0 text-caption font-semibold text-text-secondary">
                      {event.currency}
                    </span>
                    <span
                      className={cx(
                        "w-20 shrink-0 rounded-sm px-2 py-0.5 text-center text-caption font-semibold",
                        IMPACT_STYLE[event.impact]
                      )}
                    >
                      {IMPACT_LABEL[event.impact]}
                    </span>
                    <span className="flex-1 truncate text-body-sm text-text-primary">{event.title}</span>
                    <div className="flex w-72 shrink-0 items-center justify-end gap-5 font-mono text-body-sm">
                      <span className="w-20 text-right text-text-secondary">{event.forecast || "-"}</span>
                      <span className="w-20 text-right text-text-muted">{event.previous || "-"}</span>
                      <span
                        className={cx(
                          "w-20 text-right font-semibold",
                          event.actual ? "text-text-primary" : "text-text-muted"
                        )}
                      >
                        {event.actual || "-"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
