"use client";

import { useMemo, useState } from "react";
import { Search, Plus } from "lucide-react";
import { TradesTable } from "@/components/trades/TradesTable";
import { AddTradeModal } from "@/components/trades/AddTradeModal";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { formatCurrency } from "@/lib/utils";
import type { Trade, TradeSide, TradeStatus } from "@/lib/types";

type SideFilter = "ALL" | TradeSide;
type StatusFilter = "ALL" | TradeStatus;

export function TradesClient({ trades, openModal }: { trades: Trade[]; openModal?: boolean }) {
  const [search, setSearch] = useState("");
  const [side, setSide] = useState<SideFilter>("ALL");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [modalOpen, setModalOpen] = useState(!!openModal);

  const filtered = useMemo(() => {
    return trades.filter((t) => {
      if (search && !t.symbol.toLowerCase().includes(search.toLowerCase())) return false;
      if (side !== "ALL" && t.side !== side) return false;
      if (status !== "ALL" && t.status !== status) return false;
      return true;
    });
  }, [trades, search, side, status]);

  const closed = trades.filter((t) => t.status === "CLOSED" && t.pnl !== null);
  const totalPnl = closed.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const openCount = trades.filter((t) => t.status === "OPEN").length;
  const winRate = closed.length > 0 ? (closed.filter((t) => (t.pnl ?? 0) > 0).length / closed.length) * 100 : 0;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h2 text-text-primary">Trades Journal</h1>
          <p className="text-body-sm text-text-secondary">Every position, logged with discipline.</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary text-body-sm">
          <Plus className="h-4 w-4" />
          Add Manual Trade
        </button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total P&L" value={formatCurrency(totalPnl)} valueClassName={totalPnl >= 0 ? "text-success" : "text-error"} />
        <KpiCard label="Open Trades" value={String(openCount)} />
        <KpiCard label="Win Rate" value={`${winRate.toFixed(1)}%`} />
        <KpiCard label="Total Trades" value={String(trades.length)} />
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search symbol (e.g. XAUUSD)"
            className="input-field pl-9"
          />
        </div>
        <div className="flex gap-2">
          <select value={side} onChange={(e) => setSide(e.target.value as SideFilter)} className="input-field w-auto">
            <option value="ALL">All Sides</option>
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className="input-field w-auto">
            <option value="ALL">All Status</option>
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      <TradesTable trades={filtered} />

      {modalOpen && <AddTradeModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}
