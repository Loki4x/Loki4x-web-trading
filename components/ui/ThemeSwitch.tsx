"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useThemeMode, type ThemeMode } from "@/lib/theme";
import { useT } from "@/lib/i18n/client";
import { cx } from "@/lib/utils";

const OPTIONS: { value: ThemeMode; icon: typeof Sun; labelKey: string }[] = [
  { value: "system", icon: Monitor, labelKey: "appearance.system" },
  { value: "light", icon: Sun, labelKey: "appearance.light" },
  { value: "dark", icon: Moon, labelKey: "appearance.dark" },
];

/** Pilihan tema tiga ikon (ikuti sistem | terang | gelap), kecil dan muat di bawah sidebar. */
export function ThemeSwitch({ className }: { className?: string }) {
  const t = useT();
  const [mode, setMode] = useThemeMode();

  return (
    <div
      role="group"
      aria-label={t("appearance.theme")}
      className={cx("inline-flex items-center rounded-full border border-border bg-surface-2 p-0.5", className)}
    >
      {OPTIONS.map(({ value, icon: Icon, labelKey }) => (
        <button
          key={value}
          type="button"
          title={t(labelKey)}
          aria-label={t(labelKey)}
          aria-pressed={mode === value}
          onClick={() => setMode(value)}
          className={cx(
            "btn-fx flex h-7 w-7 items-center justify-center rounded-full",
            mode === value ? "bg-primary text-text-on-primary" : "text-text-muted hover:text-text-primary"
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
