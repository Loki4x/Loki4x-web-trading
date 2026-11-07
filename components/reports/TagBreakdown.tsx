import { cx, formatCurrency } from "@/lib/utils";
import type { AccountCurrency } from "@/lib/types";

export interface TagRow {
  label: string;
  total: number;
  wins: number;
  pnl: number;
}

/** Ringkasan performa per kelompok (strategi, emosi, dst): jumlah trade, win rate, dan total P&L. */
export function TagBreakdown({
  title,
  rows,
  currency,
  empty,
  headers,
}: {
  title: string;
  rows: TagRow[];
  currency: AccountCurrency;
  empty: string;
  headers: { trades: string; winRate: string; pnl: string };
}) {
  const sorted = [...rows].sort((a, b) => b.pnl - a.pnl);
  return (
    <div className="card">
      <h3 className="mb-4 text-caption font-semibold uppercase tracking-wide text-text-muted">{title}</h3>
      {sorted.length === 0 ? (
        <p className="text-body-sm text-text-muted">{empty}</p>
      ) : (
        <table className="w-full text-body-sm">
          <thead className="text-left text-caption text-text-muted">
            <tr>
              <th className="pb-2 font-medium" />
              <th className="pb-2 text-right font-medium">{headers.trades}</th>
              <th className="pb-2 text-right font-medium">{headers.winRate}</th>
              <th className="pb-2 text-right font-medium">{headers.pnl}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const wr = r.total > 0 ? (r.wins / r.total) * 100 : 0;
              return (
                <tr key={r.label} className="border-t border-border">
                  <td className="py-2 font-medium text-text-primary">{r.label}</td>
                  <td className="py-2 text-right tabular-nums text-text-secondary">{r.total}</td>
                  <td className={cx("py-2 text-right tabular-nums font-semibold", wr >= 60 ? "text-success" : wr < 50 ? "text-error" : "text-text-secondary")}>
                    {wr.toFixed(0)}%
                  </td>
                  <td className={cx("py-2 text-right tabular-nums font-semibold", r.pnl >= 0 ? "text-success" : "text-error")}>
                    {formatCurrency(r.pnl, currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
