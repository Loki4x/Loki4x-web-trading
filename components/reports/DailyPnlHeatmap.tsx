import type { AccountCurrency } from "@/lib/types";

const DAY_LABELS = ["S", "S", "R", "K", "J", "S", "M"]; // Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu

interface DayPnl {
  day: number;
  pnl: number;
}

// Format angka jadi ringkas: 445000 -> "445k", 1445000 -> "1.445k" (IDR)
// atau "1,445k" (USD). Di bawah 1000 ditampilkan apa adanya, nggak pakai "k".
function formatCompactAmount(value: number, currency: AccountCurrency) {
  const prefix = currency === "IDR" ? "Rp" : "$";
  const abs = Math.abs(Math.round(value));
  const locale = currency === "IDR" ? "id-ID" : "en-US";

  if (abs < 1000) {
    return `${prefix}${abs}`;
  }

  const scaled = Math.round(abs / 1000);
  return `${prefix}${scaled.toLocaleString(locale)}k`;
}

export function DailyPnlHeatmap({
  year,
  month,
  days,
  currency = "USD",
}: {
  year: number;
  month: number;
  days: DayPnl[];
  currency?: AccountCurrency;
}) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Minggu .. 6 = Sabtu
  const leadingBlanks = (firstDayOfWeek + 6) % 7; // geser biar mingguan mulai dari Senin

  const pnlByDay = new Map(days.map((d) => [d.day, d.pnl]));
  const maxAbs = Math.max(1, ...days.map((d) => Math.abs(d.pnl)));

  const cells: (number | null)[] = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const monthLabel = new Date(year, month, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  function intensityClass(pnl: number) {
    const ratio = Math.abs(pnl) / maxAbs;
    const isProfit = pnl >= 0;
    if (ratio > 0.6) return isProfit ? "bg-success/40" : "bg-error/40";
    if (ratio > 0.25) return isProfit ? "bg-success/25" : "bg-error/25";
    return isProfit ? "bg-success/10" : "bg-error/10";
  }

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-h3 text-text-primary">Daily P&amp;L Heatmap</h3>
        <span className="text-body-sm font-medium text-text-secondary">{monthLabel}</span>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {DAY_LABELS.map((label, i) => (
          <div key={i} className="pb-1 text-center text-caption font-semibold uppercase text-text-muted">
            {label}
          </div>
        ))}

        {cells.map((day, i) => {
          if (day === null) return <div key={`blank-${i}`} />;

          const pnl = pnlByDay.get(day);
          const hasTrade = pnl !== undefined && pnl !== 0;
          const colorClass = hasTrade ? intensityClass(pnl!) : "bg-surface-2";

          return (
            <div key={day} className={`flex aspect-square flex-col justify-between rounded-lg p-2 ${colorClass}`}>
              <span className="text-caption text-text-muted">{day}</span>
              {hasTrade && (
                <span className={`text-caption font-semibold ${pnl! >= 0 ? "text-success" : "text-error"}`}>
                  {pnl! >= 0 ? "+" : "-"}
                  {formatCompactAmount(pnl!, currency)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-end gap-4 text-caption text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-error/40" /> Loss
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-success/40" /> Profit
        </span>
      </div>
    </div>
  );
}
