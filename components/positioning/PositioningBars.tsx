import type { Positioning } from "@/lib/types";

export function PositioningBars({ items }: { items: Positioning[] }) {
  if (items.length === 0) {
    return <div className="card py-12 text-center text-body-sm text-text-muted">Belum ada data positioning.</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map((p) => (
        <div key={p.id} className="card">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-body-sm font-semibold text-text-primary">{p.symbol}</p>
            <p className="text-caption text-text-muted">
              {new Date(p.updated_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}
            </p>
          </div>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-2">
            <div className="bg-success" style={{ width: `${p.long_percent}%` }} />
            <div className="bg-error" style={{ width: `${p.short_percent}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-caption">
            <span className="text-success">Long {p.long_percent}%</span>
            <span className="text-error">Short {p.short_percent}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}
