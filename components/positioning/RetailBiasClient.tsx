"use client";

import { useMemo, useState } from "react";
import { cx } from "@/lib/utils";
import { categorizeSymbol, getContrarianSignal, CATEGORY_LABEL, SIGNAL_LABEL, type AssetCategory, type ContrarianSignal } from "@/lib/asset-category";

export interface RetailBiasItem {
  symbol: string;
  long_percent: number;
  short_percent: number;
  source: "auto" | "manual";
  updated_at?: string;
}

type CategoryFilter = "ALL" | AssetCategory;
type SortMode = "LONG" | "SHORT" | "AZ";

const CATEGORY_FILTERS: { key: CategoryFilter; label: string }[] = [
  { key: "ALL", label: "Semua" },
  { key: "CURRENCY", label: "Currency" },
  { key: "COMMODITY", label: "Commodity" },
  { key: "INDEX", label: "Index" },
  { key: "CRYPTO", label: "Crypto" },
];

const SIGNAL_STYLE: Record<ContrarianSignal, string> = {
  BEARISH: "bg-error-subtle text-error",
  NEUTRAL: "bg-surface-2 text-text-secondary",
  BULLISH: "bg-success-subtle text-success",
};

export function RetailBiasClient({ items }: { items: RetailBiasItem[] }) {
  const [category, setCategory] = useState<CategoryFilter>("ALL");
  const [sortMode, setSortMode] = useState<SortMode>("LONG");

  const enriched = useMemo(
    () =>
      items.map((p) => ({
        ...p,
        category: categorizeSymbol(p.symbol),
        signal: getContrarianSignal(p.long_percent),
      })),
    [items]
  );

  const counts = useMemo(() => {
    return {
      BEARISH: enriched.filter((i) => i.signal === "BEARISH").length,
      NEUTRAL: enriched.filter((i) => i.signal === "NEUTRAL").length,
      BULLISH: enriched.filter((i) => i.signal === "BULLISH").length,
    };
  }, [enriched]);

  const filtered = useMemo(() => {
    if (category === "ALL") return enriched;
    return enriched.filter((i) => i.category === category);
  }, [enriched, category]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sortMode === "LONG") list.sort((a, b) => b.long_percent - a.long_percent);
    else if (sortMode === "SHORT") list.sort((a, b) => b.short_percent - a.short_percent);
    else list.sort((a, b) => a.symbol.localeCompare(b.symbol));
    return list;
  }, [filtered, sortMode]);

  if (items.length === 0) {
    return <div className="card py-12 text-center text-body-sm text-text-muted">Belum ada data positioning.</div>;
  }

  return (
    <div>
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="card">
          <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">Contrarian Bearish</p>
          <p className="text-h2 text-error">{counts.BEARISH}</p>
        </div>
        <div className="card">
          <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">Neutral</p>
          <p className="text-h2 text-text-secondary">{counts.NEUTRAL}</p>
        </div>
        <div className="card">
          <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">Contrarian Bullish</p>
          <p className="text-h2 text-success">{counts.BULLISH}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {CATEGORY_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setCategory(key)}
              className={cx(
                "rounded-full px-3.5 py-1.5 text-body-sm font-medium transition-colors",
                category === key ? "bg-primary text-text-on-primary" : "bg-surface-2 text-text-secondary hover:bg-surface-hover"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)} className="input-field w-auto">
          <option value="LONG">Paling Long</option>
          <option value="SHORT">Paling Short</option>
          <option value="AZ">A-Z</option>
        </select>
      </div>

      <div className="flex flex-col gap-3">
        {sorted.map((p) => (
          <div key={p.symbol} className="card">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <p className="text-body-sm font-semibold text-text-primary">{p.symbol}</p>
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                  {CATEGORY_LABEL[p.category]}
                </span>
                {p.source === "auto" && (
                  <span className="flex items-center gap-1 rounded-full bg-success-subtle px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-success">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />
                    Live
                  </span>
                )}
              </div>
              <span className={cx("rounded-full px-2.5 py-0.5 text-caption font-semibold", SIGNAL_STYLE[p.signal])}>
                {SIGNAL_LABEL[p.signal]}
              </span>
            </div>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-2">
              <div className="bg-success" style={{ width: `${p.long_percent}%` }} />
              <div className="bg-error" style={{ width: `${p.short_percent}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-caption">
              <span className="text-success">Long {p.long_percent}%</span>
              <span className="text-text-muted">
                {p.source === "auto"
                  ? "Myfxbook"
                  : p.updated_at
                    ? new Date(p.updated_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })
                    : "Manual"}
              </span>
              <span className="text-error">Short {p.short_percent}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
