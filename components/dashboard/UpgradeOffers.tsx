import Link from "next/link";
import { Check } from "lucide-react";
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
    <div className="mb-6">
      <h2 className="mb-4 text-h3 text-text-primary">Paket Langganan</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {visibleOffers.map((offer) => (
          <div key={offer.key} className="card">
            <div className="flex items-baseline justify-between">
              <h3 className="text-body font-semibold text-text-primary">{offer.name}</h3>
              <p className="text-h3 text-text-primary">
                {offer.price}
                <span className="text-body-sm font-normal text-text-muted">{offer.period}</span>
              </p>
            </div>
            <ul className="mt-3 flex flex-col gap-2">
              {offer.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-body-sm text-text-secondary">
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/upgrade" className="btn-primary mt-4 flex w-full items-center justify-center">
              Ambil Paket
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
