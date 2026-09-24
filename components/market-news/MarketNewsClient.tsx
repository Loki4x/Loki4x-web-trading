"use client";

import { useMemo, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { cx, formatRelativeTime } from "@/lib/utils";
import { CategoryBadge } from "@/components/market-news/CategoryBadge";
import type { MarketNewsCategory, MarketNewsItem } from "@/lib/market-news";

type FilterKey = "ALL" | MarketNewsCategory;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "ALL", label: "Semua" },
  { key: "FOREX", label: "Forex" },
  { key: "GOLD", label: "Gold" },
  { key: "COMMODITIES", label: "Commodities" },
  { key: "CRYPTO", label: "Crypto" },
  { key: "STOCKS", label: "Stocks" },
];

export function MarketNewsClient({ news }: { news: MarketNewsItem[] }) {
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(() => {
    if (filter === "ALL") return news;
    return news.filter((item) => item.categories.includes(filter));
  }, [news, filter]);

  function handleRefresh() {
    setRefreshing(true);
    window.location.reload();
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cx(
                "rounded-full px-3.5 py-1.5 text-body-sm font-medium transition-colors",
                filter === key
                  ? "bg-primary text-text-on-primary"
                  : "bg-surface-2 text-text-secondary hover:bg-surface-hover"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 self-start text-body-sm font-medium text-text-secondary hover:text-text-primary sm:self-auto"
        >
          <RefreshCw className={cx("h-3.5 w-3.5", refreshing && "animate-spin")} />
          Refresh
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="card py-12 text-center text-body-sm text-text-muted">
          Belum ada berita untuk kategori ini.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((item) => (
            <a
              key={item.id}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="card flex flex-col gap-3 transition-colors hover:border-primary/40 hover:bg-surface-hover"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                {item.categories.map((cat) => (
                  <CategoryBadge key={cat} category={cat} />
                ))}
              </div>

              <h3 className="text-body font-semibold leading-snug text-text-primary">{item.title}</h3>

              {item.summary && (
                <p className="line-clamp-2 text-body-sm text-text-secondary">{item.summary}</p>
              )}

              <div className="mt-auto flex items-center justify-between pt-1 text-caption text-text-muted">
                <span className="font-medium">{item.source}</span>
                <span className="flex items-center gap-1">
                  {formatRelativeTime(item.publishedAt)}
                  <ExternalLink className="h-3 w-3" />
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
