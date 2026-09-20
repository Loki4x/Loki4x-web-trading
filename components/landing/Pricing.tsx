import Link from "next/link";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Free",
    description: "For traders getting their journal habit started.",
    price: "$0",
    period: "forever",
    features: ["Dashboard overview"],
    cta: "Get Started Free",
    href: "/signup",
    featured: false,
  },
  {
    name: "VIP",
    description: "Unlock signals and market positioning data.",
    price: "$20",
    period: "/ month",
    features: [
      "Everything in Free",
      "Signals & Track Record",
      "Market Positioning data",
      "Or join free via IB partner broker",
    ],
    cta: "Get VIP",
    href: "/signup",
    featured: true,
  },
  {
    name: "Membership",
    description: "Full access for serious, active traders.",
    price: "$35",
    period: "/ month",
    features: [
      "Everything in VIP",
      "Unlimited Trade Journal",
      "Full Reports & Performance",
      "Lot Calculator",
      "Economic Calendar",
      "Full Academy access",
    ],
    cta: "Get Membership",
    href: "/signup",
    featured: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-content px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-h2 text-text-primary">Simple pricing, no surprises</h2>
        <p className="mt-3 text-body text-text-secondary">
          Start free. Upgrade when your journal outgrows the basics.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative rounded-2xl border p-8 ${
              plan.featured ? "border-primary bg-primary-subtle/40" : "border-border bg-surface"
            }`}
          >
            {plan.featured && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-caption font-bold uppercase tracking-wide text-text-on-primary">
                Most Popular
              </span>
            )}

            <h3 className="text-h3 text-text-primary">{plan.name}</h3>
            <p className="mt-2 text-body-sm text-text-secondary">{plan.description}</p>

            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-h1 font-display font-extrabold text-text-primary">{plan.price}</span>
              <span className="text-body-sm text-text-muted">{plan.period}</span>
            </div>

            <ul className="mt-6 flex flex-col gap-3">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-body-sm text-text-secondary">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href={plan.href}
              className={`mt-8 flex w-full items-center justify-center rounded-full px-6 py-3 font-semibold transition-colors ${
                plan.featured
                  ? "bg-primary text-text-on-primary shadow-glow hover:bg-primary-hover"
                  : "border border-border bg-surface-2 text-text-primary hover:bg-surface-hover"
              }`}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
