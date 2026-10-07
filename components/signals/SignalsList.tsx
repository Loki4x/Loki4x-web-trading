"use client";

import { useMemo, useState } from "react";
import { ImageIcon } from "lucide-react";
import { TradeSideBadge } from "@/components/trades/TradeSideBadge";
import { PortfolioGrowthChart } from "@/components/signals/PortfolioGrowthChart";
import { SignalAnalysisModal } from "@/components/signals/SignalAnalysisModal";
import { cx, formatDate, formatPrice } from "@/lib/utils";
import { categorizeSymbol, CATEGORY_LABEL, type AssetCategory } from "@/lib/asset-category";
import {
  buildGrowthSeries,
  computeSignalStats,
  signalResultPips,
  signalStatusClass,
  SIGNAL_STATUS_LABEL,
  isTerminalStatus,
} from "@/lib/signal-metrics";
import type { Signal, SignalUpdate } from "@/lib/types";
import { useT } from "@/lib/i18n/client";
import type { DictKey } from "@/lib/i18n/dictionary";

type CategoryFilter = "ALL" | AssetCategory;
type PositionTab = "ACTIVE" | "DONE";

const CATEGORY_FILTERS: { key: CategoryFilter; label: DictKey | null; raw?: string }[] = [
  { key: "ALL", label: "signals.filter.all" },
  { key: "CURRENCY", label: null, raw: "Currency" },
  { key: "COMMODITY", label: null, raw: "Commodity" },
  { key: "INDEX", label: null, raw: "Index" },
  { key: "CRYPTO", label: null, raw: "Crypto" },
];

function daysAgoLabel(dateString: string, t: (k: DictKey, v?: Record<string, string | number>) => string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days <= 0) return t("common.today");
  return t("common.daysAgo", { n: days });
}

function priceDistancePercent(
  reference: number,
  target: number,
  t: (k: DictKey, v?: Record<string, string | number>) => string
): string {
  const pct = (Math.abs(target - reference) / reference) * 100;
  return t("signals.fromPrice", { pct: pct.toFixed(2) });
}

export function SignalsList({
  signals,
  updatesBySignal = {},
}: {
  signals: Signal[];
  updatesBySignal?: Record<string, SignalUpdate[]>;
}) {
  const t = useT();
  const [category, setCategory] = useState<CategoryFilter>("ALL");
  const [positionTab, setPositionTab] = useState<PositionTab>("ACTIVE");
  const [analysisSignal, setAnalysisSignal] = useState<Signal | null>(null);

  const filtered = useMemo(() => {
    if (category === "ALL") return signals;
    return signals.filter((s) => categorizeSymbol(s.symbol) === category);
  }, [signals, category]);

  const stats = useMemo(() => computeSignalStats(filtered), [filtered]);
  const growthSeries = useMemo(() => buildGrowthSeries(filtered), [filtered]);

  const activeSignals = filtered.filter((s) => !isTerminalStatus(s.status));
  const doneSignals = filtered.filter((s) => isTerminalStatus(s.status));
  const visibleSignals = positionTab === "ACTIVE" ? activeSignals : doneSignals;

  const sortedVisible = [...visibleSignals].sort(
    (a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime()
  );

  return (
    <div>
      {/* Filter jenis pasar */}
      <div className="mb-6 flex flex-wrap gap-2">
        {CATEGORY_FILTERS.map(({ key, label, raw }) => (
          <button
            key={key}
            onClick={() => setCategory(key)}
            className={cx(
              "rounded-full px-2 py-1 text-caption font-semibold transition-colors",
              category === key ? "bg-primary text-text-on-primary" : "bg-surface-2 text-text-secondary hover:bg-surface-hover"
            )}
          >
            {label ? t(label) : raw}
          </button>
        ))}
      </div>

      {/* Stats cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card !p-4">
          <p className="text-caption text-text-secondary">{t("signals.totalR")}</p>
          <p className={cx("text-h3", stats.totalR >= 0 ? "text-success" : "text-error")}>
            {stats.totalR >= 0 ? "+" : ""}
            {stats.totalR.toFixed(1)}R
          </p>
          <p className="text-caption text-text-muted">{t("signals.rTrades", { count: stats.rTradeCount })}</p>
          <p className="text-caption text-text-muted">
            {`${t("signals.simGrowth")} ${stats.totalGrowthPercent >= 0 ? "+" : ""}${stats.totalGrowthPercent.toFixed(1)}% (${stats.monthGrowthPercent >= 0 ? "+" : ""}${stats.monthGrowthPercent.toFixed(1)}% ${t("signals.thisMonth")})`}
          </p>
        </div>
        <div className="card !p-4">
          <p className="text-caption text-text-secondary">{t("signals.winRate")}</p>
          <p className="text-h3 text-text-primary">{stats.winRate.toFixed(0)}%</p>
          <p className="text-caption text-text-muted">
            {t("signals.profitLoss", { wins: stats.wins, losses: stats.losses })}
          </p>
        </div>
        <div className="card !p-4">
          <p className="text-caption text-text-secondary">{t("signals.maxDrawdown")}</p>
          <p className="text-h3 text-error">{stats.maxDrawdownPercent.toFixed(1)}%</p>
          <p className="text-caption text-text-muted">{t("signals.maxDrawdownDesc")}</p>
        </div>
        <div className="card !p-4">
          <p className="text-caption text-text-secondary">{t("signals.active")}</p>
          <p className="text-h3 text-text-primary">{stats.activeCount}</p>
          <p className="text-caption text-text-muted">{t("signals.activeDesc")}</p>
        </div>
      </div>

      {/* Ringkasan pips, ditampilkan terpisah karena satuannya beda (pips, bukan %) */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card !p-4">
          <p className="text-caption text-text-secondary">{t("signals.pipsEarned")}</p>
          <p className={cx("text-h3", stats.totalPips >= 0 ? "text-success" : "text-error")}>
            {stats.totalPips >= 0 ? "+" : ""}
            {stats.totalPips.toFixed(1)} pips
          </p>
          <p className="text-caption text-text-muted">{t("signals.pipsEarnedDesc")}</p>
        </div>
        <div className="card !p-4">
          <p className="text-caption text-text-secondary">{t("signals.pipsProfit")}</p>
          <p className="text-h3 text-success">
            +{stats.profitPips.toFixed(1)} pips
          </p>
          <p className="text-caption text-text-muted">{t("signals.pipsProfitDesc")}</p>
        </div>
        <div className="card !p-4">
          <p className="text-caption text-text-secondary">{t("signals.pipsLoss")}</p>
          <p className="text-h3 text-error">
            {stats.lossPips > 0 ? "-" : ""}
            {stats.lossPips.toFixed(1)} pips
          </p>
        </div>
      </div>

      {/* Chart pertumbuhan portofolio */}
      <div className="mb-6">
        <PortfolioGrowthChart points={growthSeries} />
      </div>

      {/* Tabel posisi */}
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => setPositionTab("ACTIVE")}
          className={cx(
            "rounded-full px-2 py-1 text-caption font-semibold transition-colors",
            positionTab === "ACTIVE" ? "bg-primary text-text-on-primary" : "bg-surface-2 text-text-secondary hover:bg-surface-hover"
          )}
        >
          {t("signals.tabActive")} ({activeSignals.length})
        </button>
        <button
          onClick={() => setPositionTab("DONE")}
          className={cx(
            "rounded-full px-2 py-1 text-caption font-semibold transition-colors",
            positionTab === "DONE" ? "bg-primary text-text-on-primary" : "bg-surface-2 text-text-secondary hover:bg-surface-hover"
          )}
        >
          {t("signals.tabDone")} ({doneSignals.length})
        </button>
      </div>

      {sortedVisible.length === 0 ? (
        <div className="card py-12 text-center text-body-sm text-text-muted">
          {positionTab === "ACTIVE" ? t("signals.emptyActive") : t("signals.emptyDone")}
        </div>
      ) : (
        <div className="card overflow-x-auto !p-0">
          <table className="w-full min-w-[920px] border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface text-left">
                {(
                  [
                    "signals.col.asset",
                    "signals.col.side",
                    "signals.col.entry",
                    "signals.col.result",
                    "signals.col.sl",
                    "signals.col.tp",
                    "signals.col.status",
                    "signals.col.opened",
                    "signals.col.analysis",
                  ] as DictKey[]
                ).map(
                  (h) => (
                    <th key={h} className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-secondary">
                      {t(h)}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {sortedVisible.map((s) => {
                const pnl = signalResultPips(s);
                return (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                    <td className="px-4 py-3">
                      <p className="text-body-sm font-semibold text-text-primary">{s.symbol}</p>
                      <p className="text-caption text-text-muted">{CATEGORY_LABEL[categorizeSymbol(s.symbol)]}</p>
                    </td>
                    <td className="px-4 py-3">
                      <TradeSideBadge side={s.side} />
                    </td>
                    <td className="tabular-nums px-4 py-3 text-body-sm text-text-secondary">
                      {formatPrice(s.entry_price, s.symbol)}
                    </td>
                    <td className="px-4 py-3">
                      {pnl !== null ? (
                        <span className={cx("text-body-sm font-semibold", pnl >= 0 ? "text-success" : "text-error")}>
                          {pnl >= 0 ? "+" : ""}
                          {pnl.toFixed(1)} pips
                        </span>
                      ) : (
                        <span className="text-body-sm text-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {s.stop_loss !== null ? (
                        <>
                          <p className="tabular-nums text-body-sm text-error">{formatPrice(s.stop_loss, s.symbol)}</p>
                          <p className="text-caption text-text-muted">
                            {priceDistancePercent(s.entry_price, s.stop_loss, t)}
                          </p>
                        </>
                      ) : (
                        <span className="text-body-sm text-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {s.take_profit !== null ? (
                        <>
                          <p className="tabular-nums text-body-sm text-success">{formatPrice(s.take_profit, s.symbol)}</p>
                          <p className="text-caption text-text-muted">
                            {priceDistancePercent(s.entry_price, s.take_profit, t)}
                          </p>
                        </>
                      ) : (
                        <span className="text-body-sm text-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cx("inline-flex rounded-md px-1.5 py-0.5 text-badge font-bold leading-none", signalStatusClass(s.status))}>
                        {SIGNAL_STATUS_LABEL[s.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-body-sm text-text-secondary">{formatDate(s.posted_at)}</p>
                      <p className="text-caption text-text-muted">{daysAgoLabel(s.posted_at, t)}</p>
                    </td>
                    <td className="px-4 py-3">
                      {s.chart_image_url || s.notes || (updatesBySignal[s.id]?.length ?? 0) > 0 ? (
                        <button
                          onClick={() => setAnalysisSignal(s)}
                          className="flex items-center gap-1.5 text-body-sm font-medium text-primary hover:underline"
                        >
                          <ImageIcon className="h-4 w-4" />
                          {t("signals.view")}
                          {(updatesBySignal[s.id]?.length ?? 0) > 0 && (
                            <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary">
                              {updatesBySignal[s.id].length}
                            </span>
                          )}
                        </button>
                      ) : (
                        <span className="text-body-sm text-text-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-caption text-text-muted">
        {t("signals.disclaimer")}
      </p>

      {analysisSignal && (
        <SignalAnalysisModal
          signal={analysisSignal}
          updates={updatesBySignal[analysisSignal.id] ?? []}
          onClose={() => setAnalysisSignal(null)}
        />
      )}
    </div>
  );
}
