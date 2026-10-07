import Link from "next/link";
import { ArrowRight, NotebookPen, Newspaper, LineChart, Landmark, Calculator, GraduationCap } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";

// Warna ikon bergantian, memakai token tema supaya tampil benar di mode gelap maupun terang.
const TONES = [
  "bg-primary-subtle text-primary",
  "bg-success-subtle text-success",
  "bg-warning-subtle text-warning",
];

const modules = [
  {
    icon: NotebookPen,
    title: "Trade Journal",
    description:
      "Log every entry and exit in seconds. Your win rate, risk-reward, and running P&L update automatically as you go.",
  },
  {
    icon: LineChart,
    title: "Signals & Track Record",
    description:
      "Follow curated trade signals backed by a transparent, verifiable track record — no cherry-picked results.",
  },
  {
    icon: Landmark,
    title: "Institutional Positioning (COT)",
    description:
      "See how large institutions are positioned before you enter, based on official CFTC Commitment of Traders (COT) data.",
  },
  {
    icon: Newspaper,
    title: "Real-Time Economic Calendar",
    description:
      "High-impact releases flagged with actual vs. forecast vs. previous, filterable by currency and importance.",
  },
  {
    icon: Calculator,
    title: "Lot Calculator",
    description:
      "Calculate position size, risk exposure, and potential profit before every trade — no more guesswork.",
  },
  {
    icon: GraduationCap,
    title: "Academy",
    description:
      "Structured lessons across Technical Analysis, Fundamentals, and Trading Psychology to sharpen your edge.",
  },
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-24 border-t border-border py-20">
      <div className="mx-auto grid max-w-content gap-12 px-6 lg:grid-cols-[320px_1fr]">
        <Reveal className="lg:sticky lg:top-24 lg:self-start">
          <span className="inline-flex rounded-full bg-primary-subtle px-3 py-1 text-badge font-semibold tracking-wide text-primary">
            FEATURES
          </span>
          <h2 className="mt-4 text-h1 text-text-primary">Everything you need in one place</h2>
          <p className="mt-4 text-body-lg text-text-secondary">
            From logging your trades to understanding why the market moved, Loki4x Academy
            brings the whole toolkit into a single workspace.
          </p>
          <Link href="/signup" className="btn-ghost mt-6 inline-flex">
            Start free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {modules.map(({ icon: Icon, title, description }, i) => (
            <Reveal key={title} delay={(i % 2) * 120} className="h-full">
              <div className="card flex h-full flex-col gap-4 !p-6 transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${TONES[i % TONES.length]}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-h3 text-text-primary">{title}</h3>
                  <p className="mt-2 text-body-sm text-text-secondary">{description}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
