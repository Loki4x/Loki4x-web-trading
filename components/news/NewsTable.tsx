"use client";

import { useMemo, useState } from "react";
import { NewsImpactBadge } from "@/components/news/NewsImpactBadge";
import { formatDate, formatTime } from "@/lib/utils";
import type { NewsEvent, NewsImpact } from "@/lib/types";

type ImpactFilter = "ALL" | NewsImpact;

export function NewsTable({ events }: { events: NewsEvent[] }) {
  const [impact, setImpact] = useState<ImpactFilter>("ALL");
  const [currency, setCurrency] = useState("ALL");

  const currencies = useMemo(
    () => Array.from(new Set(events.map((e) => e.currency))).sort(),
    [events]
  );

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (impact !== "ALL" && e.impact_level !== impact) return false;
      if (currency !== "ALL" && e.currency !== currency) return false;
      return true;
    });
  }, [events, impact, currency]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-h2 text-text-primary">Economic Calendar &amp; Market News</h1>
        <div className="flex gap-2">
          <select value={impact} onChange={(e) => setImpact(e.target.value as ImpactFilter)} className="input-field w-auto">
            <option value="ALL">All Impact</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="input-field w-auto">
            <option value="ALL">All Currencies</option>
            {currencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card overflow-x-auto !p-0">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface text-left">
              {["Time", "Impact", "Currency", "Event", "Actual", "Forecast", "Previous"].map((h) => (
                <th key={h} className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-secondary">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-body-sm text-text-muted">
                  No news events match your filters.
                </td>
              </tr>
            )}
            {filtered.map((event) => (
              <tr key={event.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                <td className="px-4 py-3 text-body-sm text-text-secondary">
                  <div className="flex flex-col">
                    <span className="font-mono">{formatTime(event.release_time)}</span>
                    <span className="text-caption text-text-muted">{formatDate(event.release_time)}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <NewsImpactBadge impact={event.impact_level} />
                </td>
                <td className="px-4 py-3 text-body-sm font-semibold text-text-primary">{event.currency}</td>
                <td className="px-4 py-3 text-body-sm text-text-primary">{event.event_title}</td>
                <td className="tabular-nums px-4 py-3 text-right text-body-sm text-text-primary">{event.actual ?? "—"}</td>
                <td className="tabular-nums px-4 py-3 text-right text-body-sm text-text-secondary">{event.forecast ?? "—"}</td>
                <td className="tabular-nums px-4 py-3 text-right text-body-sm text-text-secondary">{event.previous ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
