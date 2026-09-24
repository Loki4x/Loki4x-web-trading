import { cx } from "@/lib/utils";
import type { MarketNewsCategory } from "@/lib/market-news";

const STYLES: Record<MarketNewsCategory, string> = {
  FOREX: "bg-primary-subtle text-primary",
  CRYPTO: "bg-warning-subtle text-warning",
  STOCKS: "bg-success-subtle text-success",
  COMMODITIES: "bg-info-subtle text-info",
  GOLD: "bg-[#f5c451]/15 text-[#f5c451]",
};

const LABELS: Record<MarketNewsCategory, string> = {
  FOREX: "Forex",
  CRYPTO: "Crypto",
  STOCKS: "Stocks",
  COMMODITIES: "Commodities",
  GOLD: "Gold",
};

export function CategoryBadge({ category }: { category: MarketNewsCategory }) {
  return (
    <span className={cx("inline-flex rounded-full px-2.5 py-0.5 text-caption font-semibold", STYLES[category])}>
      {LABELS[category]}
    </span>
  );
}
