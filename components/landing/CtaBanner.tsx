import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";

export function CtaBanner() {
  return (
    <section className="border-t border-border py-20">
      <div className="mx-auto max-w-content px-6">
        <Reveal from="zoom">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary to-[#7C5CFA] px-8 py-12 md:px-14">
            <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div>
                <h2 className="text-h1 text-white">Ready to elevate your trading?</h2>
                <p className="mt-3 max-w-md text-body-lg text-white/80">
                  Start your journal today. It takes less than two minutes to log your first trade.
                </p>
              </div>
              <Link
                href="/signup"
                className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-primary transition-transform hover:scale-[1.03]"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
