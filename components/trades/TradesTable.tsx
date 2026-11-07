"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { TradeSideBadge } from "@/components/trades/TradeSideBadge";
import { StatusBadge } from "@/components/trades/StatusBadge";
import { WinLossBadge } from "@/components/trades/WinLossBadge";
import { EditTradeModal } from "@/components/trades/EditTradeModal";
import { formatCurrency, formatDate, formatPrice, pnlColorClass } from "@/lib/utils";
import { deleteTrade } from "@/app/(dashboard)/trades/actions";
import type { Trade, AccountCurrency } from "@/lib/types";
import { EMOTION_LABEL, isEmotion } from "@/lib/journal-tags";
import { useT } from "@/lib/i18n/client";

export function TradesTable({
  trades,
  currency = "USD",
  strategyOptions = [],
}: {
  trades: Trade[];
  currency?: AccountCurrency;
  strategyOptions?: string[];
}) {
  const t = useT();
  const router = useRouter();
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

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
              <td className="px-4 py-3">
                <p className="text-body-sm font-semibold text-text-primary">{trade.symbol}</p>
                {(trade.strategy || trade.emotion || trade.followed_plan !== null) && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {trade.strategy && (
                      <span className="rounded-full bg-primary-subtle px-1.5 py-0.5 text-[10px] font-semibold text-primary">{trade.strategy}</span>
                    )}
                    {trade.emotion && isEmotion(trade.emotion) && (
                      <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary">
                        {t(EMOTION_LABEL[trade.emotion])}
                      </span>
                    )}
                    {trade.followed_plan === false && (
                      <span className="rounded-full bg-warning-subtle px-1.5 py-0.5 text-[10px] font-semibold text-warning">{t("Melanggar rencana")}</span>
                    )}
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                <TradeSideBadge side={trade.side} />
              </td>
              <td className="tabular-nums px-4 py-3 text-right text-body-sm text-text-secondary">
                {formatPrice(trade.entry_price, trade.symbol)}
              </td>
              <td className="tabular-nums px-4 py-3 text-right text-body-sm text-text-secondary">
                {trade.exit_price ? formatPrice(trade.exit_price, trade.symbol) : "—"}
              </td>
              <td className="tabular-nums px-4 py-3 text-right text-body-sm text-text-secondary">
                {trade.pips !== null ? trade.pips : "—"}
              </td>
              <td className={`tabular-nums px-4 py-3 text-right text-body-sm font-semibold ${pnlColorClass(trade.pnl ?? 0)}`}>
                {trade.pnl !== null ? formatCurrency(trade.pnl, currency) : "—"}
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
                  <button onClick={() => setEditingTrade(trade)} className="text-text-muted hover:text-primary">
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

      {editingTrade && (
        <EditTradeModal
          trade={editingTrade}
          accountCurrency={currency}
          strategyOptions={strategyOptions}
          onClose={() => setEditingTrade(null)}
        />
      )}
    </div>
  );
}
