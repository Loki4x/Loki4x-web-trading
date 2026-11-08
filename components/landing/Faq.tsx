import { ChevronDown } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { Accent, SectionHeading } from "@/components/landing/SectionHeading";
import { getLandingT } from "@/lib/i18n/landing";

// Pertanyaan dan jawaban ditulis dalam bahasa Inggris; versi Indonesia ada di lib/i18n/landing.ts.
const FAQ: { q: string; a: string }[] = [
  {
    q: "Is profit guaranteed?",
    a: "No. Loki4x Academy is a journal and educational tool. Signals and news are references, not financial advice, and trading always carries a risk of loss.",
  },
  {
    q: "What is the difference between Free, VIP and Membership?",
    a: "Free gives you the dashboard overview and the economic calendar. VIP adds signals with a transparent track record and COT positioning. Membership unlocks everything: the unlimited trade journal, full reports, the lot calculator and the full Academy.",
  },
  {
    q: "How do I pay?",
    a: "QRIS and bank virtual account payments are processed automatically, and your plan activates right after payment. USDT is verified manually by an admin, usually within one business day.",
  },
  {
    q: "Does my plan renew automatically?",
    a: "No. We never charge you automatically. When your plan ends, your account returns to Free until you decide to pay again.",
  },
  {
    q: "How do I receive signals?",
    a: "VIP and Membership members get push notifications for new signals, updates and closed results. You can turn them on and choose which pairs to follow in Settings.",
  },
  {
    q: "Can I use it on my phone?",
    a: "Yes. Install it as an app: download the Android APK from the footer, or add the site to your Home Screen on iPhone.",
  },
  {
    q: "Is my trade journal private?",
    a: "Yes. Your trades are visible only to you. Nothing you log is shared or published.",
  },
  {
    q: "Can I get a refund?",
    a: "Successful payments are not refundable because access activates immediately, except for double payments or system errors on our side.",
  },
];

export async function Faq() {
  const { l } = await getLandingT();
  const items = FAQ.map((f) => ({ q: l(f.q), a: l(f.a) }));

  // Data terstruktur FAQ supaya Google bisa menampilkan pertanyaan di hasil pencarian.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <section id="faq" className="scroll-mt-24 border-t border-border">
      <div className="mx-auto max-w-3xl px-6 py-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SectionHeading badge={l("FAQ")}>
        {l("Questions,")} <Accent>{l("answered")}</Accent>
      </SectionHeading>

      <div className="mt-12 flex flex-col gap-3">
        {items.map((f, i) => (
          <Reveal key={f.q} delay={i * 40}>
            <details className="group rounded-2xl border border-border bg-surface/60 px-6 py-4 backdrop-blur transition-colors duration-200 open:border-primary/40">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-body font-semibold text-text-primary [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronDown className="h-5 w-5 shrink-0 text-text-muted transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-body-sm leading-relaxed text-text-secondary">{f.a}</p>
            </details>
          </Reveal>
        ))}
      </div>
      </div>
    </section>
  );
}
