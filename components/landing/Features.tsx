import { NotebookPen, Newspaper, Check } from "lucide-react";

const modules = [
  {
    icon: NotebookPen,
    title: "Seamless trade logging",
    description:
      "Record every entry and exit in seconds. Loki4x tracks your win rate, risk-reward, and running P&L as you go, so the numbers are always current.",
    points: ["Win / loss breakdown", "Risk-reward per trade", "Running P&L and balance"],
  },
  {
    icon: Newspaper,
    title: "Real-time economic calendar",
    description:
      "Know what's on the calendar before you open a position. High-impact releases are flagged so they never catch your trade off guard.",
    points: ["High, medium, low impact tags", "Actual vs. forecast vs. previous", "Filter by currency"],
  },
];

export function Features() {
  return (
    <section id="features" className="border-t border-border py-20">
      <div className="mx-auto max-w-content px-6">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-h1 text-text-primary">Two tools. One workspace.</h2>
          <p className="mt-4 text-body-lg text-text-secondary">
            Everything you need to trade with discipline lives in the same place
            as the news that explains why the market moved.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2">
          {modules.map(({ icon: Icon, title, description, points }) => (
            <div key={title} className="card flex flex-col gap-5 !p-8">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-subtle">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-h3 text-text-primary">{title}</h3>
                <p className="mt-2 text-body text-text-secondary">{description}</p>
              </div>
              <ul className="mt-1 flex flex-col gap-2.5 border-t border-border pt-5">
                {points.map((point) => (
                  <li key={point} className="flex items-center gap-2.5 text-body-sm text-text-secondary">
                    <Check className="h-4 w-4 shrink-0 text-success" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
