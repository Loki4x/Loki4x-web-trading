import Link from "next/link";
import { Check, Zap } from "lucide-react";
import type { Tier } from "@/lib/tier";

const offers = [
  {
    key: "VIP" as const,
    name: "VIP",
    price: "$20",
    period: "/ bulan",
    features: ["Signals & Track Record", "Market Positioning"],
  },
  {
    key: "MEMBERSHIP" as const,
    name: "Membership",
    price: "$35",
    period: "/ bulan",
    features: ["Semua fitur VIP", "Journal, Reports, Calculator", "Economic Calendar & Academy"],
  },
];

export function UpgradeOffers({ tier }: { tier: Tier }) {
  if (tier === "MEMBERSHIP") return null;
  const visibleOffers = offers.filter((o) => o.key !== tier);

  return (
    <div className="card border-primary/30 bg-primary-subtle/20">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15">
          <Zap className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-caption font-semibold uppercase tracking-wide text-primary">Upgrade Membership</p>
          <p className="text-body-sm font-semibold text-text-primary">Ambil paket buat unlock semua fitur</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {visibleOffers.map((offer) => (
          <div key={offer.key} className="rounded-lg border border-border bg-surface p-3">
            <div className="flex items-baseline justify-between">
              <p className="text-body-sm font-semibold text-text-primary">{offer.name}</p>
              <p className="text-body font-semibold text-text-primary">
                {offer.price}
                <span className="text-caption font-normal text-text-muted">{offer.period}</span>
              </p>
            </div>
            <ul className="mt-2 flex flex-col gap-1">
              {offer.features.map((f) => (
                <li key={f} className="flex items-center gap-1.5 text-caption text-text-secondary">
                  <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <Link href="/upgrade" className="btn-primary mt-4 flex w-full items-center justify-center">
        Ambil Paket
      </Link>
    </div>
  );
}
