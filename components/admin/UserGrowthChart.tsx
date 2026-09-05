"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface GrowthPoint {
  month: string;
  free: number;
  vip: number;
}

export function UserGrowthChart({ data }: { data: GrowthPoint[] }) {
  return (
    <div className="card">
      <h3 className="mb-4 text-body font-semibold text-text-primary">User Growth (Free vs VIP)</h3>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#221b38" />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} />
          <YAxis tick={{ fontSize: 12, fill: "#64748b" }} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#120e22",
              border: "1px solid #221b38",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="free" name="Free" stroke="#64748b" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="vip" name="VIP" stroke="#8b5cf6" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
