import type { Tier } from "@/lib/tier";

const tierLabel: Record<Tier, string> = {
  FREE: "Free",
  VIP: "VIP",
  MEMBERSHIP: "Membership",
};

export function MembershipStatusBar({ tier, expiresAt }: { tier: Tier; expiresAt: string | null }) {
  const isActive = tier !== "FREE";

  const expiresLabel = expiresAt
    ? new Date(expiresAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    : isActive
      ? "Lifetime"
      : "—";

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="card">
        <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">Status Membership</p>
        <p className={`mt-1 text-h3 ${isActive ? "text-success" : "text-error"}`}>
          {isActive ? "Aktif" : "Belum Aktif"}
        </p>
      </div>
      <div className="card">
        <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">Paket</p>
        <p className="mt-1 text-h3 text-text-primary">{tierLabel[tier]}</p>
      </div>
      <div className="card">
        <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">Berlaku Hingga</p>
        <p className="mt-1 text-h3 text-text-primary">{expiresLabel}</p>
      </div>
    </div>
  );
}

