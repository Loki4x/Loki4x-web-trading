"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface TrendPoint {
  day: string;
  entries: number;
}

export function JournalTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="card">
      <h3 className="mb-4 text-body font-semibold text-text-primary">Daily Journal Entries (Last 14 Days)</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#221b38" />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#64748b" }} />
          <YAxis tick={{ fontSize: 12, fill: "#64748b" }} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#120e22",
              border: "1px solid #221b38",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Bar dataKey="entries" name="Entries" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
