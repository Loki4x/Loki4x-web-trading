"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cx, formatDate } from "@/lib/utils";
import type { GrowthPoint } from "@/lib/signal-metrics";
import { useT } from "@/lib/i18n/client";
import type { DictKey } from "@/lib/i18n/dictionary";

type RangeFilter = "7D" | "30D" | "ALL";

const RANGE_OPTIONS: { key: RangeFilter; label: DictKey; days: number | null }[] = [
  { key: "7D", label: "signals.chart.7d", days: 7 },
  { key: "30D", label: "signals.chart.30d", days: 30 },
  { key: "ALL", label: "signals.chart.all", days: null },
];

export function PortfolioGrowthChart({ points }: { points: GrowthPoint[] }) {
  const t = useT();
  const [range, setRange] = useState<RangeFilter>("ALL");

  const { filtered, baseGrowth } = useMemo(() => {
    const option = RANGE_OPTIONS.find((r) => r.key === range);
    if (!option || option.days === null) return { filtered: points, baseGrowth: 0 };
    const cutoff = Date.now() - option.days * 24 * 60 * 60 * 1000;
    const inRange = points.filter((p) => new Date(p.date).getTime() >= cutoff);
    const before = points.filter((p) => new Date(p.date).getTime() < cutoff);
    // Titik awal rentang = growth kumulatif terakhir sebelum rentang dimulai (0 kalau belum ada).
    return {
      filtered: inRange,
      baseGrowth: before.length > 0 ? before[before.length - 1].growthPercent : 0,
    };
  }, [points, range]);

  // Sumbu Y mulai dari 0% (atau titik terendah kalau growth sempat negatif), dengan tick bulat,
  // supaya tidak muncul label aneh seperti -95% di bawah.
  const { yDomain, yTicks } = useMemo(() => {
    const values = filtered.map((p) => p.growthPercent);
    const lower = Math.min(0, ...(values.length ? values : [0]));
    const upper = Math.max(1, ...(values.length ? values : [0]));
    const raw = (upper - lower) / 4;
    const pow = Math.pow(10, Math.floor(Math.log10(raw)));
    const frac = raw / pow;
    const step = (frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10) * pow;
    const ticks: number[] = [];
    let v = Math.ceil(lower / step) * step;
    for (;;) {
      ticks.push(Number(v.toFixed(6)));
      if (v >= upper) break;
      v += step;
    }
    return { yDomain: [lower, ticks[ticks.length - 1]] as [number, number], yTicks: ticks };
  }, [filtered]);

  const chartData = filtered.map((p) => ({
    date: formatDate(p.date),
    growth: Number(p.growthPercent.toFixed(2)),
  }));

  const latest = filtered.length > 0 ? filtered[filtered.length - 1].growthPercent : 0;
  // Growth majemuk: perubahan dalam rentang = rasio terhadap titik awal, bukan selisih persen.
  const rangeChange =
    filtered.length > 0 ? ((1 + latest / 100) / (1 + baseGrowth / 100) - 1) * 100 : 0;
  const isPositive = latest >= 0;

  return (
    <div className="card">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-h3 text-text-primary">{t("signals.chart.title")}</h3>
          <p className="text-caption text-text-secondary">{t("signals.chart.subtitle")}</p>
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
              {t(label)}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-baseline gap-6">
        <div>
          <p className="text-caption text-text-muted">{t("signals.chart.growth")}</p>
          <p className={cx("text-h3", isPositive ? "text-success" : "text-error")}>
            {isPositive ? "+" : ""}
            {latest.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-caption text-text-muted">{t("signals.chart.rangeChange")}</p>
          <p className={cx("text-body-sm font-semibold", rangeChange >= 0 ? "text-success" : "text-error")}>
            {rangeChange >= 0 ? "+" : ""}
            {rangeChange.toFixed(1)}%
          </p>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="flex h-[220px] items-center justify-center text-body-sm text-text-muted">
          {t("signals.chart.empty")}
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
              type="number"
              domain={yDomain}
              ticks={yTicks}
              tickFormatter={(v) => `${Number(Number(v).toFixed(2))}%`}
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
              formatter={(value: number) => [`${value >= 0 ? "+" : ""}${value}%`, t("signals.chart.tooltip")]}
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
