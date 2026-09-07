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
    </header>
  );
}
