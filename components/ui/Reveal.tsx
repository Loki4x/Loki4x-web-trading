"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "@/lib/utils";

export type RevealFrom = "bottom" | "top" | "left" | "right" | "zoom" | "none";

const HIDDEN_CLASS: Record<RevealFrom, string> = {
  bottom: "opacity-0 translate-y-8",
  top: "opacity-0 -translate-y-8",
  left: "opacity-0 -translate-x-8",
  right: "opacity-0 translate-x-8",
  zoom: "opacity-0 scale-95",
  none: "opacity-0",
};

// idle   -> tampilan asli (server render / elemen yang sudah kelihatan saat load)
// hidden -> disembunyikan (cuma untuk elemen yang masih di bawah layar)
// shown  -> sedang animasi masuk
// done   -> animasi selesai, semua class animasi dilepas
type Phase = "idle" | "hidden" | "shown" | "done";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function Reveal({
  children,
  from = "bottom",
  delay = 0,
  duration = 700,
  className,
}: {
  children: ReactNode;
  from?: RevealFrom;
  delay?: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mode = useRef<"skip" | "animate" | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Keputusan diambil sekali saja, supaya aman kalau effect jalan dua kali (React Strict Mode).
    if (mode.current === null) {
      const canAnimate =
        typeof IntersectionObserver !== "undefined" &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // Elemen yang sudah kelihatan saat halaman dimuat sengaja tidak disembunyikan,
      // supaya tidak ada "kedip" dari HTML server-render. Yang dianimasikan cuma
      // elemen yang masih di bawah layar.
      const belowFold = el.getBoundingClientRect().top >= window.innerHeight * 0.92;
      mode.current = canAnimate && belowFold ? "animate" : "skip";
    }
    if (mode.current === "skip") return;

    setPhase((p) => (p === "idle" ? "hidden" : p));

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setPhase("shown");
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cx(
        className,
        phase === "hidden" && HIDDEN_CLASS[from],
        phase === "shown" && "transition-[opacity,transform] ease-out"
      )}
      style={
        phase === "shown"
          ? { transitionDuration: `${duration}ms`, transitionDelay: `${delay}ms` }
          : undefined
      }
      onTransitionEnd={(e) => {
        if (e.target === e.currentTarget && phase === "shown") setPhase("done");
      }}
    >
      {children}
    </div>
  );
}
