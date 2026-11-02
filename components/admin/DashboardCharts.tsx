"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const tooltipStyle = { backgroundColor: "#353941", border: "1px solid #55585F", borderRadius: 8, fontSize: 12 };
const tick = { fontSize: 12, fill: "#64748b" };

export function SignupsChart({ data }: { data: { day: string; signups: number }[] }) {
  return (
    <div className="card">
      <h3 className="mb-4 text-body font-semibold text-text-primary">Daily Signups (last 30 days)</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#55585F" />
          <XAxis dataKey="day" tick={tick} interval={4} />
          <YAxis tick={tick} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
          <Bar dataKey="signups" name="Signups" fill="#5F85DB" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RevenueChart({ data }: { data: { month: string; idr: number }[] }) {
  return (
    <div className="card">
      <h3 className="mb-4 text-body font-semibold text-text-primary">Revenue per Month (IDR, last 6 months)</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#55585F" />
          <XAxis dataKey="month" tick={tick} />
          <YAxis tick={tick} tickFormatter={(v: number) => (v >= 1_000_000 ? `${v / 1_000_000}jt` : `${v / 1000}rb`)} />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: "rgba(255,255,255,0.05)" }}
            formatter={(v: number) => [`Rp${v.toLocaleString("id-ID")}`, "Revenue"]}
          />
          <Bar dataKey="idr" name="Revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
