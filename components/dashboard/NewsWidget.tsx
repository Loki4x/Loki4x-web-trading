import { NewsImpactBadge } from "@/components/news/NewsImpactBadge";
import { formatTime } from "@/lib/utils";
import type { NewsEvent } from "@/lib/types";

export function NewsWidget({ events }: { events: NewsEvent[] }) {
  return (
    <div className="card flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-h3 text-text-primary">Upcoming High Impact News</h3>
      </div>
      <div className="flex flex-col divide-y divide-border">
        {events.length === 0 && (
          <p className="py-6 text-center text-body-sm text-text-muted">
            No high impact events scheduled right now.
          </p>
        )}
        {events.map((event) => (
          <div key={event.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <NewsImpactBadge impact={event.impact_level} />
                <span className="text-caption font-semibold text-text-secondary">
                  {event.currency}
                </span>
              </div>
              <span className="text-body-sm text-text-primary">{event.event_title}</span>
            </div>
            <span className="whitespace-nowrap font-mono text-body-sm text-text-secondary">
              {formatTime(event.release_time)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
