import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CtaBanner() {
  return (
    <section className="border-t border-border py-20">
      <div className="mx-auto max-w-content px-6">
        <div className="relative overflow-hidden rounded-2xl border border-primary/40 bg-surface px-8 py-16 text-center glow-border">
          <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/25 blur-[100px]" />
          <div className="relative">
            <h2 className="text-h1 text-text-primary">Ready to elevate your trading?</h2>
            <p className="mx-auto mt-4 max-w-md text-body-lg text-text-secondary">
              Start your journal today. It takes less than two minutes to log
              your first trade.
            </p>
            <Link href="/signup" className="btn-primary mt-8 inline-flex">
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
