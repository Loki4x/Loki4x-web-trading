"use client";

import { useMemo, useState } from "react";
import { Search, Plus, Wallet, TrendingUp, Percent, Hash, Target, Trophy, Upload, Download } from "lucide-react";
import { TradesTable } from "@/components/trades/TradesTable";
import { AddTradeModal } from "@/components/trades/AddTradeModal";
import { ImportTradesModal } from "@/components/trades/ImportTradesModal";
import { tradesToCsv } from "@/lib/trade-import";
import { useT } from "@/lib/i18n/client";
import { AccountControl } from "@/components/accounts/AccountControl";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { EquityChart } from "@/components/dashboard/EquityChart";
import { formatCurrency, formatPlainCurrency } from "@/lib/utils";
import type { Trade, TradeSide, TradeStatus, TradingAccount, AccountCurrency } from "@/lib/types";
import type { DisciplineSummary } from "@/lib/discipline";
import { DisciplinePanel } from "@/components/discipline/DisciplinePanel";

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
  accountCurrency = "USD",
  accounts,
  allTradesSummary,
  stats,
  equityData,
  activeAccount,
  discipline,
}: {
  trades: Trade[];
  openModal?: boolean;
  accountId: string;
  accountCurrency?: AccountCurrency;
  accounts: TradingAccount[];
  allTradesSummary: TradeSummary[];
  stats: Stats;
  equityData: { date: string; balance: number }[];
  activeAccount: TradingAccount;
  discipline: DisciplineSummary;
}) {
  const [search, setSearch] = useState("");
  const [side, setSide] = useState<SideFilter>("ALL");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [modalOpen, setModalOpen] = useState(!!openModal);
  const [importOpen, setImportOpen] = useState(false);
  const t = useT();

  function exportCsv() {
    const sorted = [...trades].sort((a, b) => a.trade_date.localeCompare(b.trade_date) || a.created_at.localeCompare(b.created_at));
    const blob = new Blob([tradesToCsv(sorted as unknown as Record<string, unknown>[])], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = activeAccount.name.replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "") || "akun";
    a.href = url;
    a.download = `loki4x-journal-${safeName}-${new Date().toLocaleDateString("en-CA")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Strategi yang pernah dipakai, jadi saran di form.
  const strategyOptions = useMemo(
    () => Array.from(new Set(trades.map((t) => t.strategy).filter((s): s is string => !!s))),
    [trades]
  );

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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h2 text-text-primary">Trades Journal</h1>
          <p className="text-body-sm text-text-secondary">Every position, logged with discipline.</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button onClick={() => setImportOpen(true)} className="btn-secondary text-body-sm">
            <Upload className="h-4 w-4" />
            {t("Import")}
          </button>
          <button
            onClick={exportCsv}
            disabled={trades.length === 0}
            className="btn-secondary text-body-sm disabled:opacity-50"
            title={t("Download semua trade akun ini sebagai CSV")}
          >
            <Download className="h-4 w-4" />
            {t("Export CSV")}
          </button>
          <button onClick={() => setModalOpen(true)} className="btn-primary text-body-sm">
            <Plus className="h-4 w-4" />
            Add Manual Trade
          </button>
        </div>
      </div>

      <div className="mb-6 max-w-xs">
        <AccountControl accounts={accounts} tradesSummary={allTradesSummary} activeAccountId={accountId} />
      </div>

      <div className="mb-6">
        <DisciplinePanel summary={discipline} account={activeAccount} />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Today's P&L"
          value={formatCurrency(stats.todayPnl, accountCurrency)}
          icon={Wallet}
          valueClassName={stats.todayPnl >= 0 ? "text-success" : "text-error"}
          featured
        />
        <KpiCard label="Total Balance" value={formatPlainCurrency(stats.totalBalance, accountCurrency)} icon={TrendingUp} />
        <KpiCard
          label="Total P&L"
          value={formatCurrency(stats.totalPnl, accountCurrency)}
          icon={Target}
          valueClassName={stats.totalPnl >= 0 ? "text-success" : "text-error"}
        />
        <KpiCard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} icon={Percent} />
        <KpiCard label="Total Trades" value={String(stats.totalTrades)} icon={Hash} />
        <KpiCard label="Profit Factor" value={stats.profitFactor.toFixed(2)} icon={TrendingUp} />
        <KpiCard label="Best Day" value={formatCurrency(stats.bestDay, accountCurrency)} icon={Trophy} valueClassName="text-success" />
      </div>

      <div className="mb-6">
        <EquityChart data={equityData} currency={accountCurrency} />
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

      <TradesTable trades={filtered} currency={accountCurrency} strategyOptions={strategyOptions} />

      {modalOpen && (
        <AddTradeModal onClose={() => setModalOpen(false)} ruleLevel={discipline.overall} accountId={accountId} accountCurrency={accountCurrency} strategyOptions={strategyOptions} />
      )}

      {importOpen && (
        <ImportTradesModal
          onClose={() => setImportOpen(false)}
          accountId={accountId}
          accountName={activeAccount.name}
          accountCurrency={accountCurrency}
        />
      )}
    </div>
  );
}
