"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { formatPlainCurrency } from "@/lib/utils";

interface BreakdownPoint {
  label: string;
  value: number;
}

export function BreakdownChart({ title, data }: { title: string; data: BreakdownPoint[] }) {
  return (
    <div className="card">
      <h3 className="mb-4 text-h3 text-text-primary">{title}</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#221b38" vertical={false} />
          <XAxis dataKey="label" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${v}`}
            width={48}
          />
          <Tooltip
            contentStyle={{
              background: "#1a142d",
              border: "1px solid #221b38",
              borderRadius: "0.75rem",
              color: "#f8fafc",
            }}
            labelStyle={{ color: "#94a3b8" }}
            formatter={(value: number) => [formatPlainCurrency(value), "P&L"]}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.value >= 0 ? "#10b981" : "#ef4444"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
