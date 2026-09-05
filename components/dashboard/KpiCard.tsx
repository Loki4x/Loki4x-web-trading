import { cx } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string;
  icon?: LucideIcon;
  valueClassName?: string;
  featured?: boolean;
}

export function KpiCard({ label, value, icon: Icon, valueClassName, featured }: KpiCardProps) {
  return (
    <div
      className={cx(
        "card flex flex-col gap-3",
        featured && "border-primary/40 glow-border"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-body-sm text-text-secondary">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-text-muted" />}
      </div>
      <span className={cx("tabular-nums text-h2 font-semibold", valueClassName ?? "text-text-primary")}>
        {value}
      </span>
    </div>
  );
}
