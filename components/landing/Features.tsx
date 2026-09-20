import { NotebookPen, Newspaper, LineChart, Compass, Calculator, GraduationCap } from "lucide-react";

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
    icon: Compass,
    title: "Market Positioning",
    description:
      "See how the market is positioned before you enter. Retail sentiment and positioning data in one view.",
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
    <section id="features" className="border-t border-border py-20">
      <div className="mx-auto max-w-content px-6">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-h1 text-text-primary">Everything you need in one place</h2>
          <p className="mt-4 text-body-lg text-text-secondary">
            From logging your trades to understanding why the market moved, Loki4x Academy
            brings the whole toolkit into a single workspace.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map(({ icon: Icon, title, description }) => (
            <div key={title} className="card flex flex-col gap-4 !p-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-subtle">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-h3 text-text-primary">{title}</h3>
                <p className="mt-2 text-body-sm text-text-secondary">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
