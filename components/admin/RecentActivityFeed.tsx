import { UserPlus, Crown, NotebookText } from "lucide-react";
import { cx } from "@/lib/utils";

export interface ActivityItem {
  id: string;
  type: "signup" | "upgrade" | "trade";
  title: string;
  subtitle: string;
  timestamp: string;
}

const iconMap = {
  signup: UserPlus,
  upgrade: Crown,
  trade: NotebookText,
};

const colorMap = {
  signup: "bg-info-subtle text-info",
  upgrade: "bg-primary/15 text-primary",
  trade: "bg-success-subtle text-success",
};

export function RecentActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div className="card">
      <h3 className="mb-4 text-body font-semibold text-text-primary">Recent Activity</h3>
      {items.length === 0 ? (
        <p className="text-body-sm text-text-muted">No recent activity yet.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((item) => {
            const Icon = iconMap[item.type];
            return (
              <li key={item.id} className="flex items-start gap-3">
                <span className={cx("flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full", colorMap[item.type])}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <p className="text-body-sm font-medium text-text-primary">{item.title}</p>
                  <p className="text-caption text-text-muted">{item.subtitle}</p>
                </div>
                <span className="whitespace-nowrap text-caption text-text-muted">{item.timestamp}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
