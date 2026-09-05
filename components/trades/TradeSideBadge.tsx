import { cx } from "@/lib/utils";
import type { TradeSide } from "@/lib/types";

export function TradeSideBadge({ side }: { side: TradeSide }) {
  return (
    <span
      className={cx(
        "inline-flex rounded-md px-2.5 py-1 text-caption font-bold",
        side === "BUY"
          ? "bg-success-subtle text-success"
          : "bg-error-subtle text-error"
      )}
    >
      {side}
    </span>
  );
}
