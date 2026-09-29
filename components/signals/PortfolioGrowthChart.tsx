"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cx, formatDate } from "@/lib/utils";
import type { GrowthPoint } from "@/lib/signal-metrics";

type RangeFilter = "7D" | "30D" | "ALL";

const RANGE_OPTIONS: { key: RangeFilter; label: string; days: number | null }[] = [
  { key: "7D", label: "7 Hari", days: 7 },
  { key: "30D", label: "30 Hari", days: 30 },
  { key: "ALL", label: "Semua", days: null },
];

export function PortfolioGrowthChart({ points }: { points: GrowthPoint[] }) {
  const [range, setRange] = useState<RangeFilter>("ALL");

  const filtered = useMemo(() => {
    const option = RANGE_OPTIONS.find((r) => r.key === range);
    if (!option || option.days === null) return points;
    const cutoff = Date.now() - option.days * 24 * 60 * 60 * 1000;
    return points.filter((p) => new Date(p.date).getTime() >= cutoff);
  }, [points, range]);

  const chartData = filtered.map((p) => ({
    date: formatDate(p.date),
    growth: Number(p.growthPercent.toFixed(2)),
  }));

  const latest = filtered.length > 0 ? filtered[filtered.length - 1].growthPercent : 0;
  const rangeChange =
    filtered.length > 0 ? filtered[filtered.length - 1].growthPercent - filtered[0].growthPercent : 0;
  const isPositive = latest >= 0;

  return (
    <div className="card">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-h3 text-text-primary">Pertumbuhan Portofolio</h3>
          <p className="text-caption text-text-secondary">% kumulatif dari sinyal yang sudah selesai</p>
        </div>
        <div className="flex gap-1 rounded-full bg-surface-2 p-1">
          {RANGE_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              className={cx(
                "rounded-full px-2 py-1 text-caption font-semibold transition-colors",
                range === key ? "bg-primary text-text-on-primary" : "text-text-secondary hover:text-text-primary"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-baseline gap-6">
        <div>
          <p className="text-caption text-text-muted">Pertumbuhan</p>
          <p className={cx("text-h3", isPositive ? "text-success" : "text-error")}>
            {isPositive ? "+" : ""}
            {latest.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-caption text-text-muted">Perubahan dalam rentang</p>
          <p className={cx("text-body-sm font-semibold", rangeChange >= 0 ? "text-success" : "text-error")}>
            {rangeChange >= 0 ? "+" : ""}
            {rangeChange.toFixed(1)}%
          </p>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="flex h-[220px] items-center justify-center text-body-sm text-text-muted">
          Belum ada sinyal yang selesai di rentang ini.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.35} />
                <stop offset="100%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#494B51" vertical={false} />
            <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
              width={48}
            />
            <Tooltip
              contentStyle={{
                background: "#2D3137",
                border: "1px solid #494B51",
                borderRadius: "0.75rem",
                color: "#f8fafc",
              }}
              labelStyle={{ color: "#94a3b8" }}
              formatter={(value: number) => [`${value >= 0 ? "+" : ""}${value}%`, "Growth"]}
            />
            <Area
              type="monotone"
              dataKey="growth"
              stroke={isPositive ? "#10b981" : "#ef4444"}
              strokeWidth={2}
              fill="url(#growthFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
