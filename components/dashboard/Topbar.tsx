import Link from "next/link";
import { Plus, CircleUserRound } from "lucide-react";

export function Topbar({ userName }: { userName: string }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <header className="sticky top-0 z-10 flex h-topbar items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur">
      <div>
        <h1 className="text-h3 text-text-primary">
          {greeting}, {userName}
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/trades?add=1" className="btn-primary !px-4 !py-2 text-body-sm">
          <Plus className="h-4 w-4" />
          Add Trade
        </Link>
        <Link
          href="/settings"
          className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary hover:bg-surface-hover hover:text-text-primary"
          aria-label="Profile & Settings"
        >
          <CircleUserRound className="h-6 w-6" />
        </Link>
      </div>
    </header>
  );
}
