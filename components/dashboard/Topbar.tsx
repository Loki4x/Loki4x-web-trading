import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function Topbar({ userName }: { userName: string }) {
  const dateLabel = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="sticky top-0 z-10 flex h-topbar items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur">
      <h1 className="text-h3 text-text-primary">Halo, {userName}</h1>
      <div className="flex items-center gap-3">
        <p className="hidden text-caption uppercase tracking-wide text-text-muted sm:block">{dateLabel}</p>
        <ThemeToggle />
      </div>
    </header>
  );
}
