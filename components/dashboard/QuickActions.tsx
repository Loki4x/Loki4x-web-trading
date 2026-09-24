import Link from "next/link";
import { Lock, type LucideIcon } from "lucide-react";
import { NotebookText, BarChart3, Calculator, LineChart, Compass, Newspaper, GraduationCap } from "lucide-react";
import { cx } from "@/lib/utils";
import { hasAccess, type Tier } from "@/lib/tier";

interface ActionItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  requiredTier: Tier;
}

const ACTIONS: ActionItem[] = [
  { href: "/trades?add=1", label: "Catat Trade", description: "Isi Trade Journal", icon: NotebookText, requiredTier: "MEMBERSHIP" },
  { href: "/reports", label: "Report & Performance", description: "Analisa performa kamu", icon: BarChart3, requiredTier: "MEMBERSHIP" },
  { href: "/calculator", label: "Lot Calculator", description: "Hitung ukuran posisi", icon: Calculator, requiredTier: "MEMBERSHIP" },
  { href: "/signals", label: "Signals & Track Record", description: "Sinyal trading terbaru", icon: LineChart, requiredTier: "VIP" },
  { href: "/positioning", label: "Market Positioning", description: "Sentimen retail terkini", icon: Compass, requiredTier: "VIP" },
  { href: "/news", label: "Economic News", description: "Kalender ekonomi real-time", icon: Newspaper, requiredTier: "MEMBERSHIP" },
  { href: "/academy/technical", label: "Academy", description: "Belajar teknikal & fundamental", icon: GraduationCap, requiredTier: "MEMBERSHIP" },
];

export function QuickActions({ tier }: { tier: Tier }) {
  return (
    <div className="card">
      <h2 className="mb-4 text-h3 text-text-primary">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {ACTIONS.map((action) => {
          const unlocked = hasAccess(tier, action.requiredTier);
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={unlocked ? action.href : "/upgrade"}
              className={cx(
                "group relative flex flex-col gap-2 rounded-xl border p-4 transition-colors",
                unlocked
                  ? "border-border hover:border-primary/40 hover:bg-surface-hover"
                  : "border-border/60 opacity-60 hover:opacity-90"
              )}
            >
              {!unlocked && (
                <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-surface-2">
                  <Lock className="h-3 w-3 text-text-muted" />
                </span>
              )}
              <Icon className="h-5 w-5 text-primary" />
              <div>
                <p className="text-body-sm font-semibold text-text-primary">{action.label}</p>
                <p className="text-caption text-text-muted">{action.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
