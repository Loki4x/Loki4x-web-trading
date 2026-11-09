"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { cx } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { useThemeMode, type ThemeMode } from "@/lib/theme";

export function AppearancePanel() {
  const t = useT();
  const [mode, setMode] = useThemeMode();

  const options: { key: ThemeMode; label: string; icon: typeof Sun }[] = [
    { key: "light", label: t("appearance.light"), icon: Sun },
    { key: "dark", label: t("appearance.dark"), icon: Moon },
    { key: "system", label: t("appearance.system"), icon: Monitor },
  ];

  return (
    <div className="card !p-6">
      <h2 className="text-h3 text-text-primary">{t("appearance.title")}</h2>
      <p className="mb-5 text-body-sm text-text-secondary">{t("appearance.subtitle")}</p>

      <p className="mb-3 text-caption font-semibold uppercase tracking-wide text-text-muted">{t("appearance.theme")}</p>
      <div className="grid grid-cols-3 gap-3">
        {options.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={cx(
              "flex flex-col items-center gap-2 rounded-xl border p-4 text-body-sm font-medium transition-colors",
              mode === key
                ? "border-success bg-success/10 text-success"
                : "border-border text-text-secondary hover:bg-surface-hover"
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
