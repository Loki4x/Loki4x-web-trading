"use client";

import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cx } from "@/lib/utils";
import type { CotHistoryPoint } from "@/lib/cot";

type PeriodFilter = "ALL" | "1Y" | "3M" | "1M";

const PERIODS: { key: PeriodFilter; label: string }[] = [
  { key: "ALL", label: "Sepanjang waktu" },
  { key: "1Y", label: "1 Tahun" },
  { key: "3M", label: "3 Bulan" },
  { key: "1M", label: "1 Bulan" },
];

const PAGE_SIZE = 10;

function formatNumber(n: number) {
  return n.toLocaleString("en-US");
}

function formatSigned(n: number) {
  const s = n >= 0 ? "+" : "";
  return `${s}${formatNumber(n)}`;
}

function formatDateID(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export function CotHistoryClient({ label, points }: { label: string; points: CotHistoryPoint[] }) {
  const [period, setPeriod] = useState<PeriodFilter>("ALL");
  const [page, setPage] = useState(1);

  const filteredPoints = useMemo(() => {
    if (period === "ALL") return points;
    const days = period === "1Y" ? 365 : period === "3M" ? 90 : 30;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return points.filter((p) => new Date(p.date).getTime() >= cutoff);
  }, [points, period]);

  const latest = points[points.length - 1] ?? null;
  const fourWeeksAgo = points[points.length - 5] ?? null;
  const netChange4wk = latest && fourWeeksAgo ? latest.longPct - fourWeeksAgo.longPct : null;

  const rangeLongPct = useMemo(() => {
    if (filteredPoints.length === 0) return null;
    const values = filteredPoints.map((p) => p.longPct);
    return { min: Math.min(...values), max: Math.max(...values) };
  }, [filteredPoints]);

  const tableRows = useMemo(() => [...points].reverse(), [points]); // terbaru dulu
  const totalPages = Math.max(1, Math.ceil(tableRows.length / PAGE_SIZE));
  const pageRows = tableRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const chartData = filteredPoints.map((p) => ({
    date: new Date(p.date).toLocaleDateString("id-ID", { month: "short", year: "2-digit" }),
    longPct: p.longPct,
  }));

  if (points.length === 0) {
    return <div className="card py-12 text-center text-body-sm text-text-muted">Data histori untuk {label} belum tersedia.</div>;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {PERIODS.map(({ key, label: pLabel }) => (
          <button
            key={key}
            onClick={() => setPeriod(key)}
            className={cx(
              "rounded-full px-3.5 py-1.5 text-body-sm font-medium transition-colors",
              period === key ? "bg-primary text-text-on-primary" : "bg-surface-2 text-text-secondary hover:bg-surface-hover"
            )}
          >
            {pLabel}
          </button>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card">
          <p className="text-caption text-text-muted">Long % saat ini</p>
          <p className="text-h3 text-text-primary">{latest?.longPct ?? "—"}%</p>
        </div>
        <div className="card">
          <p className="text-caption text-text-muted">Net position</p>
          <p className={cx("text-h3", (latest?.netPos ?? 0) >= 0 ? "text-success" : "text-error")}>
            {latest ? formatSigned(latest.netPos) : "—"}
          </p>
        </div>
        <div className="card">
          <p className="text-caption text-text-muted">Net change · 4 mgg</p>
          <p className={cx("text-h3", (netChange4wk ?? 0) >= 0 ? "text-success" : "text-error")}>
            {netChange4wk !== null ? `${formatSigned(Math.round(netChange4wk * 10) / 10)}%` : "—"}
          </p>
        </div>
        <div className="card">
          <p className="text-caption text-text-muted">Rentang long % periode</p>
          <p className="text-h3 text-text-primary">{rangeLongPct ? `${rangeLongPct.min}–${rangeLongPct.max}%` : "—"}</p>
        </div>
      </div>

      <div className="card mb-6">
        <h3 className="mb-4 text-body font-semibold text-text-primary">Posisi mingguan · {label}</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#494B51" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#64748b" }} />
            <Tooltip
              contentStyle={{ backgroundColor: "#2D3137", border: "1px solid #494B51", borderRadius: 8, fontSize: 12 }}
              formatter={(value: number) => [`${value}%`, "Long %"]}
            />
            <Line type="monotone" dataKey="longPct" stroke="#5F85DB" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card overflow-x-auto !p-0">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-body font-semibold text-text-primary">Data mingguan · {label}</h3>
        </div>
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface text-left">
              {["Periode", "Long", "Short", "Long / Short %", "Net Pos", "Δ Long", "Δ Short", "Net Chg %"].map((h) => (
                <th key={h} className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-secondary">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((p, i) => (
              <tr key={p.date} className="border-b border-border last:border-0 hover:bg-surface-hover">
                <td className="px-4 py-3 text-body-sm text-text-primary">
                  {formatDateID(p.date)}
                  {page === 1 && i === 0 && (
                    <span className="ml-2 rounded-full bg-primary-subtle px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                      Terbaru
                    </span>
                  )}
                </td>
                <td className="tabular-nums px-4 py-3 text-body-sm text-text-secondary">{formatNumber(p.long)}</td>
                <td className="tabular-nums px-4 py-3 text-body-sm text-text-secondary">{formatNumber(p.short)}</td>
                <td className="tabular-nums px-4 py-3 text-body-sm text-text-secondary">{p.longPct}%</td>
                <td className={cx("tabular-nums px-4 py-3 text-body-sm font-medium", p.netPos >= 0 ? "text-success" : "text-error")}>
                  {formatSigned(p.netPos)}
                </td>
                <td className={cx("tabular-nums px-4 py-3 text-body-sm", p.deltaLong >= 0 ? "text-success" : "text-error")}>
                  {formatSigned(p.deltaLong)}
                </td>
                <td className={cx("tabular-nums px-4 py-3 text-body-sm", p.deltaShort >= 0 ? "text-error" : "text-success")}>
                  {formatSigned(p.deltaShort)}
                </td>
                <td className={cx("tabular-nums px-4 py-3 text-body-sm font-semibold", p.netChangePct >= 0 ? "text-success" : "text-error")}>
                  {formatSigned(p.netChangePct)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <p className="text-caption text-text-muted">
            Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, tableRows.length)} dari {tableRows.length} minggu
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-md px-2.5 py-1 text-body-sm text-text-secondary hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              ‹
            </button>
            <span className="px-2 py-1 text-body-sm text-text-primary">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-md px-2.5 py-1 text-body-sm text-text-secondary hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
