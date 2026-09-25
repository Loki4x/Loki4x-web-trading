import { cx } from "@/lib/utils";
import type { CotHighlight } from "@/lib/cot-highlights";

interface RetailBiasRow {
  symbol: string;
  percent: number;
}

function HighlightBar({
  label,
  value,
  widthPercent,
  positive,
}: {
  label: string;
  value: string;
  widthPercent: number;
  positive: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="w-16 shrink-0 text-body-sm font-semibold text-text-primary">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
        <div
          className={cx("h-full rounded-full", positive ? "bg-success" : "bg-error")}
          style={{ width: `${Math.min(100, Math.max(4, widthPercent))}%` }}
        />
      </div>
      <span className={cx("w-14 shrink-0 text-right text-body-sm font-semibold", positive ? "text-success" : "text-error")}>
        {value}
      </span>
    </div>
  );
}

function CotCard({
  positive,
  negative,
  reportDate,
}: {
  positive: CotHighlight[];
  negative: CotHighlight[];
  reportDate: string | null;
}) {
  const maxAbs = Math.max(1, ...[...positive, ...negative].map((i) => Math.abs(i.netChangePct)));

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-body font-semibold text-text-primary">COT Highlights</h3>
        <span className="text-caption text-text-muted">
          {reportDate ? `Laporan ${new Date(reportDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}` : "perubahan mingguan"}
        </span>
      </div>

      {positive.length === 0 && negative.length === 0 ? (
        <p className="text-body-sm text-text-muted">Data COT belum tersedia.</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-caption font-semibold uppercase tracking-wide text-text-muted">Net Chg % Positif</p>
            <div className="flex flex-col gap-2">
              {positive.map((item) => (
                <HighlightBar
                  key={item.label}
                  label={item.label}
                  value={`+${item.netChangePct}%`}
                  widthPercent={(Math.abs(item.netChangePct) / maxAbs) * 100}
                  positive
                />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-caption font-semibold uppercase tracking-wide text-text-muted">Net Chg % Negatif</p>
            <div className="flex flex-col gap-2">
              {negative.map((item) => (
                <HighlightBar
                  key={item.label}
                  label={item.label}
                  value={`${item.netChangePct}%`}
                  widthPercent={(Math.abs(item.netChangePct) / maxAbs) * 100}
                  positive={false}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RetailBiasCard({ longTop, shortTop }: { longTop: RetailBiasRow[]; shortTop: RetailBiasRow[] }) {
  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-body font-semibold text-text-primary">Retail Bias Highlights</h3>
        <span className="text-caption text-text-muted">posisi kontrarian</span>
      </div>

      {longTop.length === 0 && shortTop.length === 0 ? (
        <p className="text-body-sm text-text-muted">Belum ada data positioning.</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-caption font-semibold uppercase tracking-wide text-text-muted">Retail Long Terbanyak</p>
            <div className="flex flex-col gap-2">
              {longTop.map((item) => (
                <HighlightBar
                  key={item.symbol}
                  label={item.symbol}
                  value={`${item.percent}% long`}
                  widthPercent={item.percent}
                  positive
                />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-caption font-semibold uppercase tracking-wide text-text-muted">Retail Short Terbanyak</p>
            <div className="flex flex-col gap-2">
              {shortTop.map((item) => (
                <HighlightBar
                  key={item.symbol}
                  label={item.symbol}
                  value={`${item.percent}% short`}
                  widthPercent={item.percent}
                  positive={false}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function MarketHighlights({
  cot,
  retailBias,
}: {
  cot: { positive: CotHighlight[]; negative: CotHighlight[]; reportDate: string | null };
  retailBias: { longTop: RetailBiasRow[]; shortTop: RetailBiasRow[] };
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <CotCard positive={cot.positive} negative={cot.negative} reportDate={cot.reportDate} />
      <RetailBiasCard longTop={retailBias.longTop} shortTop={retailBias.shortTop} />
    </div>
  );
}
