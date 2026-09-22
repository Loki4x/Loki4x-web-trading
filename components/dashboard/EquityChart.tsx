"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatPlainCurrency } from "@/lib/utils";
import type { AccountCurrency } from "@/lib/types";

interface EquityPoint {
  date: string;
  balance: number;
}

function formatAxisTick(value: number, currency: AccountCurrency) {
  if (currency === "IDR") {
    if (Math.abs(value) >= 1_000_000) return `Rp${(value / 1_000_000).toFixed(1)}jt`;
    return `Rp${(value / 1_000).toFixed(0)}rb`;
  }
  return `$${(value / 1000).toFixed(1)}k`;
}

export function EquityChart({ data, currency = "USD" }: { data: EquityPoint[]; currency?: AccountCurrency }) {
  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-h3 text-text-primary">Equity Growth</h3>
        <span className="text-body-sm text-text-secondary">Last {data.length} sessions</span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5F85DB" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#494B51" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatAxisTick(v, currency)}
            width={56}
          />
          <Tooltip
            contentStyle={{
              background: "#2D3137",
              border: "1px solid #494B51",
              borderRadius: "0.75rem",
              color: "#f8fafc",
            }}
            labelStyle={{ color: "#94a3b8" }}
            formatter={(value: number) => [formatPlainCurrency(value, currency), "Balance"]}
          />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="#5F85DB"
            strokeWidth={2}
            fill="url(#equityFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
