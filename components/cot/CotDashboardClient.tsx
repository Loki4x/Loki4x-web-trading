"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { cx } from "@/lib/utils";
import { CATEGORY_LABEL, type AssetCategory } from "@/lib/asset-category";
import type { CotAssetRow } from "@/lib/cot";

type CategoryFilter = "ALL" | AssetCategory;
type SortMode = "LONG_PCT" | "NET_CHG";

const CATEGORY_FILTERS: { key: CategoryFilter; label: string }[] = [
  { key: "ALL", label: "Semua" },
  { key: "CURRENCY", label: "Currency" },
  { key: "COMMODITY", label: "Commodity" },
  { key: "INDEX", label: "Index" },
  { key: "CRYPTO", label: "Crypto" },
];

function formatNumber(n: number) {
  return n.toLocaleString("en-US");
}

function formatSigned(n: number) {
  const s = n >= 0 ? "+" : "";
  return `${s}${formatNumber(n)}`;
}

function formatOpenInterest(n: number) {
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return String(n);
}

export function CotDashboardClient({ rows, reportDate }: { rows: CotAssetRow[]; reportDate: string | null }) {
  const [category, setCategory] = useState<CategoryFilter>("ALL");
  const [sortMode, setSortMode] = useState<SortMode>("LONG_PCT");

  const filtered = useMemo(() => {
    if (category === "ALL") return rows;
    return rows.filter((r) => r.category === category);
  }, [rows, category]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sortMode === "LONG_PCT") {
      list.sort((a, b) => a.longPct - b.longPct); // ascending, biar bar chart mirip referensi (rendah ke tinggi)
    } else {
      list.sort((a, b) => b.netChangePct - a.netChangePct);
    }
    return list;
  }, [filtered, sortMode]);

  const summary = useMemo(() => {
    if (rows.length === 0) return null;
    const mostLong = [...rows].sort((a, b) => b.longPct - a.longPct)[0];
    const mostShort = [...rows].sort((a, b) => a.longPct - b.longPct)[0];
    const biggestChange = [...rows].sort((a, b) => Math.abs(b.netChangePct) - Math.abs(a.netChangePct))[0];
    return { mostLong, mostShort, biggestChange };
  }, [rows]);

  if (rows.length === 0) {
    return <div className="card py-12 text-center text-body-sm text-text-muted">Data COT belum tersedia.</div>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-body-sm text-text-secondary">
          Pantau pergerakan arus big money.{" "}
          {reportDate && (
            <span className="text-text-muted">
              Terakhir diperbarui{" "}
              {new Date(reportDate).toLocaleDateString("id-ID", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
            </span>
          )}
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
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

      {summary && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="card">
            <div className="mb-2 flex items-center gap-2 text-text-muted">
              <TrendingUp className="h-4 w-4" />
              <span className="text-caption font-semibold uppercase tracking-wide">Paling Long</span>
            </div>
            <p className="text-h3 text-text-primary">{summary.mostLong.label}</p>
            <p className="text-body-sm text-text-secondary">long terbesar · {summary.mostLong.longPct}%</p>
          </div>
          <div className="card">
            <div className="mb-2 flex items-center gap-2 text-text-muted">
              <TrendingDown className="h-4 w-4" />
              <span className="text-caption font-semibold uppercase tracking-wide">Paling Short</span>
            </div>
            <p className="text-h3 text-text-primary">{summary.mostShort.label}</p>
            <p className="text-body-sm text-text-secondary">long terkecil · {summary.mostShort.longPct}%</p>
          </div>
          <div className="card">
            <div className="mb-2 flex items-center gap-2 text-text-muted">
              <Activity className="h-4 w-4" />
              <span className="text-caption font-semibold uppercase tracking-wide">Perubahan Terbesar</span>
            </div>
            <p className="text-h3 text-text-primary">{summary.biggestChange.label}</p>
            <p className={cx("text-body-sm", summary.biggestChange.netChangePct >= 0 ? "text-success" : "text-error")}>
              net chg minggu ini · {formatSigned(summary.biggestChange.netChangePct)}%
            </p>
          </div>
        </div>
      )}

      <div className="card mb-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-body font-semibold text-text-primary">Long vs Short</h3>
            <p className="text-caption text-text-muted">% dari total kontrak</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSortMode("LONG_PCT")}
              className={cx(
                "rounded-full px-3 py-1 text-caption font-semibold",
                sortMode === "LONG_PCT" ? "bg-primary text-text-on-primary" : "bg-surface-2 text-text-secondary"
              )}
            >
              Urut Long %
            </button>
            <button
              onClick={() => setSortMode("NET_CHG")}
              className={cx(
                "rounded-full px-3 py-1 text-caption font-semibold",
                sortMode === "NET_CHG" ? "bg-primary text-text-on-primary" : "bg-surface-2 text-text-secondary"
              )}
            >
              Urut Net Chg
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {sorted.map((r) => (
            <Link
              key={r.label}
              href={`/cot/${r.label.toLowerCase()}`}
              className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-hover"
            >
              <span className="w-16 shrink-0 text-body-sm font-semibold text-text-primary">{r.label}</span>
              <div className="flex h-3 flex-1 overflow-hidden rounded-full bg-surface-2">
                <div className="bg-success" style={{ width: `${r.longPct}%` }} />
                <div className="bg-error" style={{ width: `${r.shortPct}%` }} />
              </div>
              <span className="w-24 shrink-0 text-right text-caption text-text-muted">
                {r.longPct}% / {r.shortPct}%
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="card overflow-x-auto !p-0">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-body font-semibold text-text-primary">Posisi saat ini &amp; perubahan minggu ini</h3>
        </div>
        <table className="w-full min-w-[880px] border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface text-left">
              {["Aset", "Long", "Short", "Long / Short %", "Net Pos", "Open Int.", "Δ Long", "Δ Short", "Δ Open Int.", "Net Chg %"].map(
                (h) => (
                  <th key={h} className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-secondary">
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.label} className="border-b border-border last:border-0 hover:bg-surface-hover">
                <td className="px-4 py-3">
                  <Link href={`/cot/${r.label.toLowerCase()}`} className="text-body-sm font-semibold text-primary hover:underline">
                    {r.label}
                  </Link>
                </td>
                <td className="tabular-nums px-4 py-3 text-body-sm text-text-secondary">{formatNumber(r.long)}</td>
                <td className="tabular-nums px-4 py-3 text-body-sm text-text-secondary">{formatNumber(r.short)}</td>
                <td className="tabular-nums px-4 py-3 text-body-sm text-text-secondary">
                  {r.longPct} / {r.shortPct}
                </td>
                <td className={cx("tabular-nums px-4 py-3 text-body-sm font-medium", r.netPos >= 0 ? "text-success" : "text-error")}>
                  {formatSigned(r.netPos)}
                </td>
                <td className="tabular-nums px-4 py-3 text-body-sm text-text-secondary">{formatOpenInterest(r.openInterest)}</td>
                <td className={cx("tabular-nums px-4 py-3 text-body-sm", r.deltaLong >= 0 ? "text-success" : "text-error")}>
                  {formatSigned(r.deltaLong)}
                </td>
                <td className={cx("tabular-nums px-4 py-3 text-body-sm", r.deltaShort >= 0 ? "text-error" : "text-success")}>
                  {formatSigned(r.deltaShort)}
                </td>
                <td className={cx("tabular-nums px-4 py-3 text-body-sm", r.deltaOpenInterest >= 0 ? "text-success" : "text-error")}>
                  {formatSigned(r.deltaOpenInterest)}
                </td>
                <td className={cx("tabular-nums px-4 py-3 text-body-sm font-semibold", r.netChangePct >= 0 ? "text-success" : "text-error")}>
                  {formatSigned(r.netChangePct)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
