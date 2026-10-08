"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Menghitung naik angka dari 0 ke nilai akhir saat elemen masuk layar.
 * Format teks dipertahankan (tanda +/-, desimal, satuan seperti "R", "%", " pips").
 * Angka yang sudah terlihat saat halaman dimuat, atau pengguna dengan reduced-motion,
 * langsung tampil final tanpa animasi. Server-render selalu berisi nilai akhir.
 */
export function CountUp({ value, duration = 1200, className }: { value: string; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [text, setText] = useState(value);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const m = value.match(/^([^\d+-]*[+-]?)(\d+(?:\.\d+)?)(.*)$/);
    if (!m) return;
    const [, prefix, numStr, suffix] = m;
    const target = Number(numStr);
    const decimals = numStr.includes(".") ? numStr.split(".")[1].length : 0;
    const fmt = (n: number) => `${prefix}${n.toFixed(decimals)}${suffix}`;

    const canAnimate =
      typeof IntersectionObserver !== "undefined" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const belowFold = el.getBoundingClientRect().top >= window.innerHeight * 0.92;
    if (!canAnimate || !belowFold) return;

    setText(fmt(0));
    let raf = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / duration);
          setText(fmt(target * (1 - Math.pow(1 - p, 3)))); // ease-out
          if (p < 1) raf = requestAnimationFrame(tick);
          else setText(value);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}
