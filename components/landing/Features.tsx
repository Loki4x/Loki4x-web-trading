import type { ReactNode } from "react";
import { Compass, GraduationCap, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { Accent, SectionHeading } from "@/components/landing/SectionHeading";

const card =
  "relative flex h-full flex-col rounded-2xl border border-border bg-surface/60 p-6 backdrop-blur transition-colors duration-200 hover:border-primary/40";

function Mock({ children }: { children: ReactNode }) {
  return (
    <div className="relative mb-6 flex h-40 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-background/60 px-4">
      {children}
      <span className="absolute right-2 top-2 text-[9px] font-medium uppercase tracking-wider text-text-muted">Sample</span>
    </div>
  );
}

function Copy({ title, text }: { title: string; text: string }) {
  return (
    <div className="mt-auto">
      <h3 className="text-h3 text-text-primary">{title}</h3>
      <p className="mt-2 text-body-sm text-text-secondary">{text}</p>
    </div>
  );
}

const Line = ({ w }: { w: string }) => <span className="block h-2 rounded-full bg-border" style={{ width: w }} />;

const JournalMock = (
  <svg viewBox="0 0 300 120" className="h-full w-full" preserveAspectRatio="none" aria-hidden>
    <defs>
      <linearGradient id="jm" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="rgb(95,133,219)" stopOpacity=".35" />
        <stop offset="1" stopColor="rgb(95,133,219)" stopOpacity="0" />
      </linearGradient>
    </defs>
    <path d="M0 95 L35 88 L70 92 L105 70 L140 74 L175 50 L210 56 L245 30 L300 18 L300 120 L0 120Z" fill="url(#jm)" />
    <path d="M0 95 L35 88 L70 92 L105 70 L140 74 L175 50 L210 56 L245 30 L300 18" fill="none" stroke="rgb(95,133,219)" strokeWidth="2.5" />
  </svg>
);

const CalendarMock = (
  <div className="w-full max-w-xs space-y-2">
    {[
      ["High", "USD Non-Farm Payrolls", "bg-error-subtle text-error"],
      ["Med", "EUR CPI y/y", "bg-warning-subtle text-warning"],
      ["Low", "JPY Trade Balance", "bg-surface-2 text-text-secondary"],
    ].map(([lvl, name, tone]) => (
      <div key={name} className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2">
        <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${tone}`}>{lvl}</span>
        <span className="text-caption text-text-secondary">{name}</span>
      </div>
    ))}
  </div>
);

const SignalMock = (
  <div className="w-full max-w-[220px] rounded-xl border border-border bg-surface p-3">
    <div className="mb-3 flex items-center justify-between">
      <span className="text-caption font-semibold text-text-primary">XAUUSD</span>
      <span className="rounded bg-success-subtle px-2 py-0.5 text-[10px] font-bold text-success">BUY</span>
    </div>
    {["Entry", "SL", "TP"].map((l, i) => (
      <div key={l} className="mb-2 flex items-center justify-between gap-3 last:mb-0">
        <span className="text-[10px] text-text-muted">{l}</span>
        <Line w={["52%", "40%", "60%"][i]} />
      </div>
    ))}
  </div>
);

const CotMock = (
  <svg viewBox="0 0 200 90" className="h-full w-full" aria-hidden>
    {[40, 62, 30, 70, 50, 78].map((h, i) => (
      <g key={i}>
        <rect x={12 + i * 31} y={90 - h} width="10" height={h} rx="2" fill="rgb(95,133,219)" opacity=".85" />
        <rect x={24 + i * 31} y={90 - h * 0.6} width="10" height={h * 0.6} rx="2" fill="rgb(144,184,248)" opacity=".4" />
      </g>
    ))}
  </svg>
);

const LotMock = (
  <div className="w-full max-w-[220px] space-y-2">
    {["Balance", "Risk %", "Stop loss"].map((l, i) => (
      <div key={l} className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-1.5">
        <span className="text-[10px] text-text-muted">{l}</span>
        <Line w={["38%", "22%", "30%"][i]} />
      </div>
    ))}
    <div className="rounded-md bg-primary/15 px-3 py-1.5 text-center text-caption font-semibold text-primary-hover">Lot size</div>
  </div>
);

const strip = [
  { icon: GraduationCap, title: "Learn while you trade", text: "Lessons on technical analysis, fundamentals, and trading psychology, right next to your journal." },
  { icon: Compass, title: "Sentiment at a glance", text: "Retail bias and fundamentals alongside price, so you see where the crowd stands before you enter." },
  { icon: ShieldCheck, title: "Your journal stays yours", text: "Your trades are visible only to you. Nothing you log is shared or published." },
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-24 border-t border-border py-24">
      <div className="mx-auto max-w-content px-6">
        <SectionHeading
          badge="Features"
          description="Journal, signals, news, and positioning in one workspace, built for traders who want to see the whole picture."
        >
          The Toolkit Every Modern <Accent>Trader</Accent> Needs
        </SectionHeading>

        <div className="mt-14 grid grid-cols-1 gap-5 lg:grid-cols-6">
          <Reveal className="h-full lg:col-span-3">
            <div className={card}>
              <Mock>{JournalMock}</Mock>
              <Copy title="Trade Journal" text="Log every entry and exit in seconds. Win rate, risk-reward, and running P&L update automatically." />
            </div>
          </Reveal>
          <Reveal delay={120} className="h-full lg:col-span-3">
            <div className={card}>
              <Mock>{CalendarMock}</Mock>
              <Copy title="Real-Time Economic Calendar" text="High-impact releases flagged by importance and currency, so no news catches you off guard." />
            </div>
          </Reveal>
          <Reveal className="h-full lg:col-span-2">
            <div className={card}>
              <Mock>{SignalMock}</Mock>
              <Copy title="Signals & Track Record" text="Curated trade signals with a transparent record of every closed result." />
            </div>
          </Reveal>
          <Reveal delay={120} className="h-full lg:col-span-2">
            <div className={card}>
              <Mock>{CotMock}</Mock>
              <Copy title="Institutional Positioning" text="See how large players are positioned using official CFTC COT data." />
            </div>
          </Reveal>
          <Reveal delay={240} className="h-full lg:col-span-2">
            <div className={card}>
              <Mock>{LotMock}</Mock>
              <Copy title="Lot Calculator" text="Position size, risk exposure, and potential profit before every trade." />
            </div>
          </Reveal>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-3">
          {strip.map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} delay={i * 120}>
              <div className="flex items-center gap-2 text-body font-semibold text-text-primary">
                <Icon className="h-4 w-4 text-primary" />
                {title}
              </div>
              <p className="mt-2 text-body-sm text-text-secondary">{text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
