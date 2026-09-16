import Link from "next/link";
import { Lock } from "lucide-react";
import type { Tier } from "@/lib/tier";

const tierLabel: Record<Tier, string> = {
  FREE: "Free",
  VIP: "VIP",
  MEMBERSHIP: "Membership",
};

export function AccessDenied({ requiredTier }: { requiredTier: Tier }) {
  return (
    <main className="mx-auto flex max-w-content flex-col items-center justify-center px-6 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-subtle">
        <Lock className="h-8 w-8 text-primary" />
      </div>
      <h1 className="mt-6 text-h2 text-text-primary">Akses Ditolak</h1>
      <p className="mt-2 max-w-sm text-body-sm text-text-secondary">
        Fitur ini khusus untuk member tier <strong>{tierLabel[requiredTier]}</strong> ke atas.
        Upgrade langgananmu untuk membuka akses.
      </p>
      <Link href="/#pricing" className="btn-primary mt-6">
        Lihat Paket Langganan
      </Link>
    </main>
  );
}
