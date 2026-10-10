import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { Accent } from "@/components/landing/SectionHeading";

// Lantai grid berperspektif, sama dengan di Hero, memakai biru brand (#5F85DB).
const CSS = `.cta-floor{position:absolute;left:-60%;right:-60%;bottom:-10%;height:120%;transform-origin:50% 100%;transform:perspective(620px) rotateX(64deg);
background-image:linear-gradient(rgba(95,133,219,.42) 1.5px,transparent 1.5px),linear-gradient(90deg,rgba(95,133,219,.42) 1.5px,transparent 1.5px);background-size:76px 76px;
-webkit-mask-image:radial-gradient(ellipse 55% 70% at 50% 100%,#000 15%,transparent 72%);mask-image:radial-gradient(ellipse 55% 70% at 50% 100%,#000 15%,transparent 72%)}`;

export function CtaBanner() {
  return (
    <section className="relative isolate flex min-h-[100svh] items-center overflow-hidden border-t border-border">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[75%] overflow-hidden"
        style={{
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, #000 40%, #000 85%, transparent 100%)",
          maskImage: "linear-gradient(to bottom, transparent 0%, #000 40%, #000 85%, transparent 100%)",
        }}
      >
        <div className="cta-floor" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(95,133,219,0.35),transparent_65%)]" />
      </div>

      <div className="mx-auto w-full max-w-content px-6 py-28 text-center">
        <Reveal from="zoom">
          <h2 className="mx-auto max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-text-primary md:text-6xl">
            Start Trading <Accent>Smarter</Accent> Today
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-body-lg text-text-secondary">
            Start your journal for free. It takes less than two minutes to log your first trade.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="btn-primary">
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/#pricing" className="btn-ghost">
              <Play className="h-3.5 w-3.5" />
              View pricing
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
