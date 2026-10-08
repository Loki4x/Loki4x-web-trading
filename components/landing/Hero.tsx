import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ArrowRight, Calculator, Landmark, LineChart, Newspaper, NotebookPen, Play } from "lucide-react";

// Animasi masuk murni CSS: jalan sejak paint pertama tanpa nunggu JS dan tanpa "kedip" dari HTML server-render.
const enter = (delayMs: number) => ({ "--enter-delay": `${delayMs}ms` }) as CSSProperties;

// Warna cahaya memakai biru brand (#5F85DB / rgb 95,133,219), sama dengan token `primary` di tema.
const CSS = `
.lk-word{animation:lk-word .8s cubic-bezier(.22,1,.36,1) both}
@keyframes lk-word{from{opacity:0;transform:translateY(14px);filter:blur(8px)}to{opacity:1;transform:none;filter:blur(0)}}
.lk-pop{animation:lk-pop .8s cubic-bezier(.22,1,.36,1) both;animation-delay:var(--d,0ms)}
@keyframes lk-pop{from{opacity:0;transform:scale(.6) translateY(16px)}to{opacity:1;transform:none}}
.lk-float{transform:rotate(var(--r,0deg));animation:lk-float var(--dur,7s) ease-in-out infinite;animation-delay:var(--d,0ms)}
@keyframes lk-float{0%,100%{transform:translateY(0) rotate(var(--r,0deg))}50%{transform:translateY(-12px) rotate(calc(var(--r,0deg) + 4deg))}}
.lk-floor{position:absolute;left:-60%;right:-60%;bottom:-8%;height:130%;transform-origin:50% 100%;transform:perspective(620px) rotateX(64deg);
background-image:linear-gradient(rgba(95,133,219,.42) 1.5px,transparent 1.5px),linear-gradient(90deg,rgba(95,133,219,.42) 1.5px,transparent 1.5px);background-size:76px 76px;
-webkit-mask-image:radial-gradient(ellipse 55% 70% at 50% 100%,#000 15%,transparent 72%);mask-image:radial-gradient(ellipse 55% 70% at 50% 100%,#000 15%,transparent 72%)}
.lk-cell{position:absolute;width:76px;height:76px;background:rgba(95,133,219,.28);box-shadow:inset 0 0 0 1px rgba(144,184,248,.5);animation:lk-pulse 4s ease-in-out infinite;animation-delay:var(--d,0ms)}
@keyframes lk-pulse{0%,100%{opacity:.1}50%{opacity:.75}}
.lk-dot{position:absolute;width:6px;height:6px;border-radius:9999px;background:rgb(144,184,248);box-shadow:0 0 14px 4px rgba(95,133,219,.7);animation:lk-pulse 5s ease-in-out infinite;animation-delay:var(--d,0ms)}
@media (prefers-reduced-motion:reduce){.lk-word,.lk-pop,.lk-float,.lk-cell,.lk-dot{animation:none!important}}
`;

function Words({ text, start }: { text: string; start: number }) {
  return (
    <>
      {text.split(" ").map((w, i) => (
        <span key={i}>
          <span className="lk-word inline-block" style={{ animationDelay: `${start + i * 90}ms` }}>
            {w}
          </span>{" "}
        </span>
      ))}
    </>
  );
}

// ---- Ikon aset (monokrom, mengikuti warna tema) ----
const GoldIcon = (
  <svg viewBox="0 0 32 32" className="h-7 w-7" fill="currentColor" aria-hidden>
    <path d="M9 15l3-7h8l3 7z" opacity=".95" />
    <path d="M3 25l3-7h8l3 7z" opacity=".75" />
    <path d="M15 25l3-7h8l3 7z" opacity=".6" />
  </svg>
);
const BtcIcon = (
  <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
    <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M13 8v16M17 8v16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M11.5 9.5h6a3 3 0 010 6h-6zm0 6h6.8a3.2 3.2 0 010 6.4h-6.8z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);
const EthIcon = (
  <svg viewBox="0 0 32 32" className="h-7 w-7" fill="currentColor" aria-hidden>
    <path d="M16 3l-8.5 13.5L16 12z" opacity=".7" />
    <path d="M16 3l8.5 13.5L16 12z" />
    <path d="M16 29l-8.5-11L16 22.5z" opacity=".7" />
    <path d="M16 29l8.5-11L16 22.5z" />
    <path d="M7.5 16.5L16 21l8.5-4.5L16 12.5z" opacity=".85" />
  </svg>
);
const NasIcon = (
  <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 24l8-9 6 5 10-12" />
    <path d="M21 8h7v7" />
  </svg>
);

function Tile({
  icon,
  label,
  pos,
  delay,
  rot,
  dur,
  small,
}: {
  icon: ReactNode;
  label: string;
  pos: string;
  delay: number;
  rot: number;
  dur: number;
  small?: boolean;
}) {
  return (
    <div
      className={`lk-pop pointer-events-none absolute z-0 ${pos}`}
      style={{ "--d": `${delay}ms` } as CSSProperties}
      aria-hidden
    >
      <div
        className={`lk-float flex flex-col items-center justify-center gap-0.5 rounded-2xl border border-primary/30 bg-primary/15 text-primary-hover shadow-[0_0_40px_rgba(95,133,219,0.35)] backdrop-blur ${
          small ? "h-14 w-14" : "h-[72px] w-[72px]"
        }`}
        style={{ "--r": `${rot}deg`, "--dur": `${dur}s`, "--d": `${delay}ms` } as CSSProperties}
      >
        {icon}
        <span className="text-[9px] font-semibold tracking-wider text-text-secondary">{label}</span>
      </div>
    </div>
  );
}

const PILLARS = [
  { icon: NotebookPen, label: "Trade Journal" },
  { icon: LineChart, label: "Signals & Track Record" },
  { icon: Newspaper, label: "Economic Calendar" },
  { icon: Landmark, label: "COT Positioning" },
  { icon: Calculator, label: "Lot Calculator" },
];

export function Hero() {
  return (
    <section className="relative isolate flex min-h-[calc(100svh-4rem)] flex-col overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* Latar: cahaya di belakang headline, lantai grid berperspektif, titik cahaya */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[14%] h-[360px] w-[760px] -translate-x-1/2 rounded-full bg-primary/15 blur-[110px]" />
        <div
          className="absolute inset-x-0 bottom-0 h-[58%] overflow-hidden"
          style={{
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, #000 35%, #000 82%, transparent 100%)",
            maskImage: "linear-gradient(to bottom, transparent 0%, #000 35%, #000 82%, transparent 100%)",
          }}
        >
          <div className="lk-floor">
            {[
              { l: "38%", b: "10%", d: 0 },
              { l: "52%", b: "24%", d: 900 },
              { l: "45%", b: "40%", d: 1800 },
              { l: "60%", b: "6%", d: 2600 },
              { l: "31%", b: "30%", d: 3300 },
            ].map((c, i) => (
              <span key={i} className="lk-cell" style={{ left: c.l, bottom: c.b, "--d": `${c.d}ms` } as CSSProperties} />
            ))}
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(95,133,219,0.35),transparent_65%)]" />
        </div>
        <span className="lk-dot left-[18%] top-[26%]" style={{ "--d": "300ms" } as CSSProperties} />
        <span className="lk-dot right-[22%] top-[16%]" style={{ "--d": "1500ms" } as CSSProperties} />
        <span className="lk-dot left-[9%] top-[52%]" style={{ "--d": "2400ms" } as CSSProperties} />
        <span className="lk-dot right-[10%] top-[60%]" style={{ "--d": "800ms" } as CSSProperties} />
      </div>

      {/* Ubin aset melayang */}
      <Tile icon={NasIcon} label="NAS100" pos="left-[22%] top-[17%] hidden md:block" delay={1100} rot={-8} dur={7} />
      <Tile icon={EthIcon} label="ETH" pos="right-[24%] top-[13%] hidden md:block" delay={1250} rot={9} dur={8} />
      <Tile icon={GoldIcon} label="XAUUSD" pos="left-[5%] top-[7%] md:left-[11%] md:top-[56%]" delay={1400} rot={-10} dur={7.5} small />
      <Tile icon={BtcIcon} label="BTC" pos="right-[5%] top-[9%] md:right-[12%] md:top-[53%]" delay={1550} rot={10} dur={6.5} small />

      <div className="relative z-10 mx-auto flex w-full max-w-content flex-1 flex-col items-center justify-center px-6 pb-6 pt-16 text-center">
        <span
          className="animate-enter inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1 text-badge font-semibold tracking-wide text-text-secondary backdrop-blur"
          style={enter(0)}
        >
          TRADING JOURNAL &amp; MARKET NEWS
        </span>

        <h1 className="mt-6 max-w-4xl text-[2.5rem] font-extrabold leading-[1.08] tracking-tight text-text-primary md:text-[3.75rem] lg:text-[4.5rem]">
          <Words text="Log every trade." start={250} />
          <br />
          <Words text="Read every market" start={620} />
          <span
            className="lk-word inline-block italic text-primary-hover"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif', animationDelay: "1000ms" }}
          >
            move.
          </span>
        </h1>

        <p className="animate-enter mx-auto mt-6 max-w-xl text-body-lg text-text-secondary" style={enter(1100)}>
          Loki4x Academy keeps your entries, exits and reasoning in one disciplined journal, next to the economic
          releases that actually move price.
        </p>

        <div className="animate-enter mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row" style={enter(1250)}>
          <Link href="/signup" className="btn-primary">
            Get Started Free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="#features" className="btn-ghost">
            <Play className="h-3.5 w-3.5" />
            See how it works
          </Link>
        </div>
      </div>

      {/* Pengganti "Trusted by": pilar produk, duduk di atas lantai grid */}
      <div className="animate-enter relative z-10 mx-auto w-full max-w-content px-6 pb-10 pt-8 text-center" style={enter(1500)}>
        <p className="text-caption text-text-muted">One workspace for everything you need to trade with discipline</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {PILLARS.map(({ icon: Icon, label }) => (
            <span key={label} className="inline-flex items-center gap-2 text-body-sm font-medium text-text-secondary">
              <Icon className="h-4 w-4 text-primary" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
