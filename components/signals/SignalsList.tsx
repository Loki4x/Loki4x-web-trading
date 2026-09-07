import { TradeSideBadge } from "@/components/trades/TradeSideBadge";
import { cx, formatDate } from "@/lib/utils";
import type { Signal } from "@/lib/types";

const statusLabel: Record<Signal["status"], string> = {
  OPEN: "OPEN",
  TP_HIT: "TP HIT",
  SL_HIT: "SL HIT",
  CLOSED: "CLOSED",
};

function statusClass(status: Signal["status"]) {
  if (status === "TP_HIT") return "bg-success-subtle text-success";
  if (status === "SL_HIT") return "bg-error-subtle text-error";
  if (status === "OPEN") return "bg-info-subtle text-info";
  return "bg-surface-2 text-text-secondary";
}

export function SignalsList({ signals }: { signals: Signal[] }) {
  const closed = signals.filter((s) => s.status !== "OPEN");
  const wins = closed.filter((s) => s.status === "TP_HIT" || (s.result_pips ?? 0) > 0).length;
  const winRate = closed.length > 0 ? (wins / closed.length) * 100 : 0;
  const totalPips = closed.reduce((sum, s) => sum + (s.result_pips ?? 0), 0);

  return (
    <div>
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="card !p-4">
          <p className="text-caption text-text-secondary">Total Signals</p>
          <p className="text-h3 text-text-primary">{signals.length}</p>
        </div>
        <div className="card !p-4">
          <p className="text-caption text-text-secondary">Win Rate</p>
          <p className="text-h3 text-text-primary">{winRate.toFixed(1)}%</p>
        </div>
        <div className="card !p-4">
          <p className="text-caption text-text-secondary">Total Pips</p>
          <p className={cx("text-h3", totalPips >= 0 ? "text-success" : "text-error")}>
            {totalPips >= 0 ? "+" : ""}
            {totalPips.toFixed(1)}
          </p>
        </div>
      </div>

      {signals.length === 0 ? (
        <div className="card py-12 text-center text-body-sm text-text-muted">Belum ada sinyal yang diposting.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {signals.map((s) => (
            <div key={s.id} className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <TradeSideBadge side={s.side} />
                <div>
                  <p className="text-body-sm font-semibold text-text-primary">{s.symbol}</p>
                  <p className="text-caption text-text-muted">{formatDate(s.posted_at)}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-body-sm text-text-secondary">
                <span>Entry: <span className="text-text-primary">{s.entry_price}</span></span>
                {s.take_profit && <span>TP: <span className="text-success">{s.take_profit}</span></span>}
                {s.stop_loss && <span>SL: <span className="text-error">{s.stop_loss}</span></span>}
                {s.result_pips !== null && (
                  <span className={cx("font-semibold", s.result_pips >= 0 ? "text-success" : "text-error")}>
                    {s.result_pips >= 0 ? "+" : ""}
                    {s.result_pips} pips
                  </span>
                )}
              </div>
              <span className={cx("inline-flex w-fit rounded-md px-2.5 py-1 text-caption font-bold", statusClass(s.status))}>
                {statusLabel[s.status]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
