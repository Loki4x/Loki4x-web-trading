import { cx } from "@/lib/utils";
import type { TradeSide } from "@/lib/types";

export function TradeSideBadge({ side }: { side: TradeSide }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-caption font-semibold leading-none",
        side === "BUY"
          ? "bg-success-subtle text-success"
          : "bg-error-subtle text-error"
      )}
    >
      {side}
    </span>
  );
}
