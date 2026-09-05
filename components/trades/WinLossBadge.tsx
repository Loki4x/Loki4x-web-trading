import { cx } from "@/lib/utils";

export function WinLossBadge({ pnl }: { pnl: number | null }) {
  if (pnl === null) {
    return <span className="text-caption text-text-muted">—</span>;
  }

  const label = pnl > 0 ? "WIN" : pnl < 0 ? "LOSS" : "BREAK EVEN";

  return (
    <span
      className={cx(
        "inline-flex rounded-md px-2.5 py-1 text-caption font-bold",
        pnl > 0
          ? "bg-success-subtle text-success"
          : pnl < 0
          ? "bg-error-subtle text-error"
          : "bg-surface-hover text-text-secondary"
      )}
    >
      {label}
    </span>
  );
}
