"use client";

import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { TradeSideBadge } from "@/components/trades/TradeSideBadge";
import { StatusBadge } from "@/components/trades/StatusBadge";
import { WinLossBadge } from "@/components/trades/WinLossBadge";
import { formatCurrency, formatDate, pnlColorClass } from "@/lib/utils";
import { deleteTrade } from "@/app/(dashboard)/trades/actions";
import type { Trade } from "@/lib/types";

export function TradesTable({ trades }: { trades: Trade[] }) {
  const router = useRouter();

  async function handleDelete(id: string) {
    if (!confirm("Delete this trade? This cannot be undone.")) return;
    await deleteTrade(id);
    router.refresh();
  }

  return (
    <div className="card overflow-x-auto !p-0">
      <table className="w-full min-w-[720px] border-collapse">
        <thead>
          <tr className="border-b border-border bg-surface text-left">
            {["Symbol", "Side", "Entry", "Exit", "Pips", "P&L", "Result", "Date", "Status", "Photos", ""].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-secondary"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {trades.length === 0 && (
            <tr>
              <td colSpan={11} className="px-4 py-10 text-center text-body-sm text-text-muted">
                No trades match your filters yet.
              </td>
            </tr>
          )}
          {trades.map((trade) => (
            <tr key={trade.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
              <td className="px-4 py-3 text-body-sm font-semibold text-text-primary">{trade.symbol}</td>
              <td className="px-4 py-3">
                <TradeSideBadge side={trade.side} />
              </td>
              <td className="tabular-nums px-4 py-3 text-right text-body-sm text-text-secondary">
                {trade.entry_price.toFixed(5)}
              </td>
              <td className="tabular-nums px-4 py-3 text-right text-body-sm text-text-secondary">
                {trade.exit_price ? trade.exit_price.toFixed(5) : "—"}
              </td>
              <td className="tabular-nums px-4 py-3 text-right text-body-sm text-text-secondary">
                {trade.pips !== null ? trade.pips : "—"}
              </td>
              <td className={`tabular-nums px-4 py-3 text-right text-body-sm font-semibold ${pnlColorClass(trade.pnl ?? 0)}`}>
                {trade.pnl !== null ? formatCurrency(trade.pnl) : "—"}
              </td>
              <td className="px-4 py-3">
                <WinLossBadge pnl={trade.pnl} />
              </td>
              <td className="px-4 py-3 text-body-sm text-text-secondary">{formatDate(trade.trade_date)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={trade.status} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2 text-caption">
                  {trade.before_photo_url && (
                    <a href={trade.before_photo_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      Before
                    </a>
                  )}
                  {trade.after_photo_url && (
                    <a href={trade.after_photo_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      After
                    </a>
                  )}
                  {!trade.before_photo_url && !trade.after_photo_url && (
                    <span className="text-text-muted">—</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                  <button className="text-text-muted hover:text-primary">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(trade.id)} className="text-text-muted hover:text-error">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
