import Link from "next/link";
import { Check } from "lucide-react";
import { cx } from "@/lib/utils";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "For traders getting their journal habit started.",
    features: [
      "Up to 50 logged trades / month",
      "Core dashboard & equity chart",
      "Economic calendar access",
      "Win rate & P&L stats",
    ],
    cta: "Get Started Free",
    featured: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/ month",
    description: "For active traders who journal every session.",
    features: [
      "Unlimited logged trades",
      "Full reports: by pair and by month",
      "High-impact news alerts",
      "Priority support",
    ],
    cta: "Start Pro Trial",
    featured: true,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="border-t border-border py-20">
      <div className="mx-auto max-w-content px-6">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-h1 text-text-primary">Simple pricing, no surprises</h2>
          <p className="mt-4 text-body-lg text-text-secondary">
            Start free. Upgrade when your journal outgrows the basics.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cx(
                "relative flex flex-col gap-6 rounded-2xl border p-8",
                plan.featured
                  ? "border-primary/50 bg-surface glow-border"
                  : "border-border bg-surface"
              )}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-8 rounded-full bg-primary px-3 py-1 text-caption font-bold text-text-on-primary">
                  MOST POPULAR
                </span>
              )}

              <div>
                <h3 className="text-h3 text-text-primary">{plan.name}</h3>
                <p className="mt-1 text-body-sm text-text-secondary">{plan.description}</p>
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="tabular-nums text-display text-text-primary">{plan.price}</span>
                <span className="text-body-sm text-text-secondary">{plan.period}</span>
              </div>

              <ul className="flex flex-col gap-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-body-sm text-text-secondary">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className={cx(plan.featured ? "btn-primary" : "btn-secondary", "mt-auto justify-center")}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
