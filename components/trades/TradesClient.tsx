"use client";

import { useMemo, useState } from "react";
import { Search, Plus, Wallet, TrendingUp, Percent, Hash, Target, Trophy } from "lucide-react";
import { TradesTable } from "@/components/trades/TradesTable";
import { AddTradeModal } from "@/components/trades/AddTradeModal";
import { AccountControl } from "@/components/accounts/AccountControl";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { EquityChart } from "@/components/dashboard/EquityChart";
import { formatCurrency, formatPlainCurrency } from "@/lib/utils";
import type { Trade, TradeSide, TradeStatus, TradingAccount } from "@/lib/types";

type SideFilter = "ALL" | TradeSide;
type StatusFilter = "ALL" | TradeStatus;

interface TradeSummary {
  account_id: string | null;
  pnl: number | null;
  status: string;
}

interface Stats {
  todayPnl: number;
  totalBalance: number;
  totalPnl: number;
  winRate: number;
  totalTrades: number;
  profitFactor: number;
  bestDay: number;
}

export function TradesClient({
  trades,
  openModal,
  accountId,
  accounts,
  allTradesSummary,
  stats,
  equityData,
}: {
  trades: Trade[];
  openModal?: boolean;
  accountId: string;
  accounts: TradingAccount[];
  allTradesSummary: TradeSummary[];
  stats: Stats;
  equityData: { date: string; balance: number }[];
}) {
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

      <div className="mb-6 max-w-xs">
        <AccountControl accounts={accounts} tradesSummary={allTradesSummary} />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Today's P&L"
          value={formatCurrency(stats.todayPnl)}
          icon={Wallet}
          valueClassName={stats.todayPnl >= 0 ? "text-success" : "text-error"}
          featured
        />
        <KpiCard label="Total Balance" value={formatPlainCurrency(stats.totalBalance)} icon={TrendingUp} />
        <KpiCard
          label="Total P&L"
          value={formatCurrency(stats.totalPnl)}
          icon={Target}
          valueClassName={stats.totalPnl >= 0 ? "text-success" : "text-error"}
        />
        <KpiCard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} icon={Percent} />
        <KpiCard label="Total Trades" value={String(stats.totalTrades)} icon={Hash} />
        <KpiCard label="Profit Factor" value={stats.profitFactor.toFixed(2)} icon={TrendingUp} />
        <KpiCard label="Best Day" value={formatCurrency(stats.bestDay)} icon={Trophy} valueClassName="text-success" />
      </div>

      <div className="mb-6">
        <EquityChart data={equityData} />
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

      {modalOpen && <AddTradeModal onClose={() => setModalOpen(false)} accountId={accountId} />}
    </div>
  );
}
