import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { Tier } from "@/lib/tier";

const nextTierCopy: Record<Exclude<Tier, "MEMBERSHIP">, { title: string; desc: string }> = {
  FREE: {
    title: "Membership kamu belum aktif",
    desc: "Ambil paket VIP atau Membership buat unlock Signals, Positioning, Journal, dan fitur lainnya.",
  },
  VIP: {
    title: "Kamu VIP — upgrade ke Membership buat akses penuh",
    desc: "Buka Trade Journal, Reports, Lot Calculator, Economic Calendar, dan Academy.",
  },
};

export function UpgradeBanner({ tier }: { tier: Tier }) {
  if (tier === "MEMBERSHIP") return null;
  const copy = nextTierCopy[tier];

  return (
    <div className="mb-6 flex flex-col items-start justify-between gap-4 rounded-2xl border border-primary/30 bg-primary-subtle/30 p-5 sm:flex-row sm:items-center">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-body font-semibold text-text-primary">{copy.title}</p>
          <p className="mt-0.5 text-body-sm text-text-secondary">{copy.desc}</p>
        </div>
      </div>
      <Link href="/upgrade" className="btn-primary shrink-0 whitespace-nowrap">
        Ambil Paket
      </Link>
    </div>
  );
}
