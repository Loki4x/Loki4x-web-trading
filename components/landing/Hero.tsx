import Link from "next/link";
import { ArrowRight, Radio } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-grid">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />

      <div className="relative mx-auto max-w-content px-6 pb-20 pt-16 md:pt-24">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-caption font-semibold tracking-wide text-text-secondary">
            <Radio className="h-3.5 w-3.5 text-primary" />
            TRADING JOURNAL &amp; MARKET NEWS
          </span>

          <h1 className="mt-6 text-display text-text-primary">
            Log every trade. Read every market move.
          </h1>

          <p className="mx-auto mt-5 max-w-lg text-body-lg text-text-secondary">
            Loki4x keeps your entries, exits and reasoning in one disciplined
            journal, next to the economic releases that actually move price.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="btn-primary">
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="#features" className="btn-ghost">
              See how it works
            </Link>
          </div>
        </div>

        {/* Preview frame: stylised dashboard mockup, not a literal screenshot */}
        <div className="relative mx-auto mt-16 max-w-4xl">
          <div className="rounded-2xl border border-border bg-surface p-3 shadow-md glow-border sm:p-4">
            <div className="mb-3 flex items-center gap-1.5 px-2">
              <span className="h-2.5 w-2.5 rounded-full bg-error/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
            </div>
            <div className="rounded-xl border border-border bg-background p-4 sm:p-6">
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Today's P&L", value: "+$4,142.00", tone: "text-success" },
                  { label: "Total Balance", value: "$19,398.24", tone: "text-text-primary" },
                  { label: "Win Rate", value: "48.2%", tone: "text-text-primary" },
                  { label: "Profit Factor", value: "1.90", tone: "text-text-primary" },
                ].map((kpi) => (
                  <div key={kpi.label} className="rounded-lg border border-border bg-surface p-3">
                    <p className="text-caption text-text-secondary">{kpi.label}</p>
                    <p className={`tabular-nums mt-1 text-body-lg font-semibold ${kpi.tone}`}>
                      {kpi.value}
                    </p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-surface p-4 sm:col-span-2">
                  <p className="mb-3 text-body-sm font-semibold text-text-secondary">
                    Equity Growth
                  </p>
                  <svg viewBox="0 0 300 90" className="h-20 w-full">
                    <polyline
                      points="0,70 40,62 80,66 120,45 160,50 200,28 240,34 300,10"
                      fill="none"
                      stroke="#8b5cf6"
                      strokeWidth="2.5"
                    />
                  </svg>
                </div>
                <div className="rounded-lg border border-border bg-surface p-4">
                  <p className="mb-3 text-body-sm font-semibold text-text-secondary">
                    High Impact News
                  </p>
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-2">
                      <span className="rounded-sm bg-error-subtle px-2 py-0.5 text-caption font-semibold text-error">
                        High
                      </span>
                      <span className="text-caption text-text-secondary">USD Non-Farm Payrolls</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-sm bg-warning-subtle px-2 py-0.5 text-caption font-semibold text-warning">
                        Med
                      </span>
                      <span className="text-caption text-text-secondary">EUR CPI y/y</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
