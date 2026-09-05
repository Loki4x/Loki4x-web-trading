import { cx } from "@/lib/utils";
import type { NewsImpact } from "@/lib/types";

const styles: Record<NewsImpact, string> = {
  HIGH: "bg-error-subtle text-error",
  MEDIUM: "bg-warning-subtle text-warning",
  LOW: "bg-info-subtle text-info",
};

export function NewsImpactBadge({ impact }: { impact: NewsImpact }) {
  return (
    <span
      className={cx(
        "inline-flex rounded-sm px-2 py-0.5 text-caption font-semibold",
        styles[impact]
      )}
    >
      {impact.charAt(0) + impact.slice(1).toLowerCase()}
    </span>
  );
}
