import Link from "next/link";
import { Check } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { Accent, SectionHeading } from "@/components/landing/SectionHeading";
import { getLandingT } from "@/lib/i18n/landing";
import { PLAN_PRICE_IDR } from "@/lib/payment-constants";

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

const plans = [
  {
    name: "Free",
    description: "For traders getting their journal habit started.",
    price: "$0",
    period: "forever",
    features: ["Dashboard overview", "Economic Calendar"],
    cta: "Get Started Free",
    href: "/signup",
    featured: false,
  },
  {
    name: "VIP",
    description: "Unlock signals and institutional COT positioning data.",
    price: "$20",
    period: "/ month",
    idr: PLAN_PRICE_IDR.VIP,
    features: [
      "Everything in Free",
      "Signals & Track Record",
      "Institutional Positioning (COT)",
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
    idr: PLAN_PRICE_IDR.MEMBERSHIP,
    features: [
      "Everything in VIP",
      "Unlimited Trade Journal",
      "Full Reports & Performance",
      "Lot Calculator",
      "Full Academy access",
    ],
    cta: "Get Membership",
    href: "/signup",
    featured: false,
  },
];

export async function Pricing() {
  const { l, locale } = await getLandingT();
  return (
    <section id="pricing" className="scroll-mt-24 border-t border-border">
      <div className="mx-auto max-w-content px-6 py-24">
      <SectionHeading badge={l("Pricing")} description={l("Start free. Upgrade when your journal outgrows the basics.")}>
        {l("Simple pricing,")} <Accent>{l("no surprises")}</Accent>
      </SectionHeading>

      <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
        {plans.map((plan, i) => (
          <Reveal key={plan.name} delay={i * 120} className="h-full">
            <div
              className={`card-hover relative h-full rounded-2xl border p-8 ${
                plan.featured ? "border-primary bg-primary-subtle/40 shadow-[0_0_60px_rgba(95,133,219,0.2)]" : "border-border bg-surface/60 backdrop-blur"
              }`}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-1.5 py-0.5 text-badge font-bold leading-none uppercase tracking-wide text-text-on-primary">
                  {l("Most Popular")}
                </span>
              )}

              <h3 className="text-h3 text-text-primary">{plan.name}</h3>
              <p className="mt-2 text-body-sm text-text-secondary">{l(plan.description)}</p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-h1 font-display font-extrabold text-text-primary">{plan.price}</span>
                <span className="text-body-sm text-text-muted">{l(plan.period)}</span>
              </div>
              {locale === "id" && "idr" in plan && plan.idr ? (
                <p className="mt-1 text-caption text-text-muted">≈ {rupiah(plan.idr)} {l("/ month")}</p>
              ) : null}

              <ul className="mt-6 flex flex-col gap-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-body-sm text-text-secondary">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {l(f)}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`btn-fx mt-8 flex w-full items-center justify-center rounded-full px-6 py-3 font-semibold transition-colors ${
                  plan.featured
                    ? "bg-primary text-text-on-primary shadow-glow hover:bg-primary-hover"
                    : "border border-border bg-surface-2 text-text-primary hover:bg-surface-hover"
                }`}
              >
                {l(plan.cta)}
              </Link>

              {plan.name === "Membership" && (
                <p className="mt-3 text-center text-caption text-text-muted">
                  {l("Or pay once — $70 for lifetime access, no monthly renewal.")}
                  {locale === "id" ? ` (≈ ${rupiah(PLAN_PRICE_IDR.MEMBERSHIP_LIFETIME)})` : ""}
                </p>
              )}
            </div>
          </Reveal>
        ))}
      </div>
      </div>
    </section>
  );
}
