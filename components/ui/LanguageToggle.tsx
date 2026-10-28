"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useT } from "@/lib/i18n/client";
import { setLanguage } from "@/lib/i18n/actions";
import type { Locale } from "@/lib/i18n/dictionary";
import { cx } from "@/lib/utils";

const OPTIONS: { value: Locale; label: string; title: string }[] = [
  { value: "id", label: "ID", title: "Bahasa Indonesia" },
  { value: "en", label: "EN", title: "English" },
];

/** Tombol dua posisi (ID | EN) untuk mengganti bahasa web. */
export function LanguageToggle({ className }: { className?: string }) {
  const t = useT();
  const router = useRouter();
  const current = useLocale();
  const [optimistic, setOptimistic] = useState<Locale | null>(null);
  const [pending, startTransition] = useTransition();
  const active = optimistic ?? current;

  function choose(next: Locale) {
    if (next === active || pending) return;
    setOptimistic(next);
    startTransition(async () => {
      const res = await setLanguage(next);
      if (!res.ok) setOptimistic(null);
      router.refresh();
    });
  }

  return (
    <div
      role="group"
      aria-label={t("Ganti bahasa")}
      className={cx(
        "inline-flex items-center rounded-full border border-border bg-surface-2 p-0.5 text-[11px] font-bold",
        pending && "opacity-80",
        className
      )}
    >
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.title}
          aria-pressed={active === o.value}
          onClick={() => choose(o.value)}
          className={cx(
            "rounded-full px-2.5 py-1 leading-none transition-colors",
            active === o.value ? "bg-primary text-text-on-primary" : "text-text-muted hover:text-text-primary"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
