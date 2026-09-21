import { cx } from "@/lib/utils";
import type { TradeSession } from "@/lib/types";

const SESSION_LABEL: Record<TradeSession, string> = {
  LONDON: "London",
  OVERLAP: "Overlap",
  NEW_YORK: "New York",
  ASIA: "Asia",
};

const SESSION_ORDER: TradeSession[] = ["LONDON", "OVERLAP", "NEW_YORK", "ASIA"];

export interface SessionStat {
  session: TradeSession;
  winRate: number;
  total: number;
}

export function SessionBreakdown({ stats }: { stats: SessionStat[] }) {
  const bySession = new Map(stats.map((s) => [s.session, s]));

  return (
    <div className="card">
      <h3 className="mb-4 text-caption font-semibold uppercase tracking-wide text-text-muted">By Session</h3>
      <div className="flex flex-col divide-y divide-border">
        {SESSION_ORDER.map((session) => {
          const stat = bySession.get(session);
          return (
            <div key={session} className="flex items-center justify-between py-2.5">
              <span className="text-body-sm font-medium text-text-primary">{SESSION_LABEL[session]}</span>
              {stat ? (
                <span
                  className={cx(
                    "text-body-sm font-semibold",
                    stat.winRate >= 60 ? "text-success" : stat.winRate < 50 ? "text-error" : "text-text-secondary"
                  )}
                >
                  {stat.winRate.toFixed(0)}% WR
                </span>
              ) : (
                <span className="text-body-sm text-text-muted">-</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
