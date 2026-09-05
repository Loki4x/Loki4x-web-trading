import { cx } from "@/lib/utils";
import type { TradeStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: TradeStatus }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-caption font-semibold",
        status === "OPEN"
          ? "bg-info-subtle text-info"
          : "bg-surface-2 text-text-secondary"
      )}
    >
      <span
        className={cx(
          "h-1.5 w-1.5 rounded-full",
          status === "OPEN" ? "bg-info" : "bg-text-muted"
        )}
      />
      {status}
    </span>
  );
}
