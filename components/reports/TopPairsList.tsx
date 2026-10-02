import { formatCurrency } from "@/lib/utils";
import type { AccountCurrency } from "@/lib/types";
import { getT } from "@/lib/i18n/server";

interface PairRow {
  symbol: string;
  pnl: number;
}

export async function TopPairsList({ pairs, currency = "USD" }: { pairs: PairRow[]; currency?: AccountCurrency }) {
  const { t } = await getT();
  return (
    <div className="card">
      <h3 className="mb-4 text-caption font-semibold uppercase tracking-wide text-text-muted">Top Pairs</h3>
      {pairs.length === 0 ? (
        <p className="text-body-sm text-text-muted">{t("Belum ada trade closed.")}</p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {pairs.map((p) => (
            <div key={p.symbol} className="flex items-center justify-between py-2.5">
              <span className="text-body-sm font-medium text-text-primary">{p.symbol}</span>
              <span className={`text-body-sm font-semibold ${p.pnl >= 0 ? "text-success" : "text-error"}`}>
                {formatCurrency(p.pnl, currency)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
