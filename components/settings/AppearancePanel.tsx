"use client";

import { Sun, Moon, Monitor, Square, Sparkles } from "lucide-react";
import { cx } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { useThemeMode, useThemeStyle, type ThemeMode, type ThemeStyle } from "@/lib/theme";

export function AppearancePanel() {
  const t = useT();
  const [mode, setMode] = useThemeMode();
  const [style, setStyle] = useThemeStyle();

  const options: { key: ThemeMode; label: string; icon: typeof Sun }[] = [
    { key: "light", label: t("appearance.light"), icon: Sun },
    { key: "dark", label: t("appearance.dark"), icon: Moon },
    { key: "system", label: t("appearance.system"), icon: Monitor },
  ];
  const styles: { key: ThemeStyle; label: string; icon: typeof Sun }[] = [
    { key: "normal", label: t("appearance.styleNormal"), icon: Square },
    { key: "glass", label: t("appearance.styleGlass"), icon: Sparkles },
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

      <p className="mb-3 mt-6 text-caption font-semibold uppercase tracking-wide text-text-muted">{t("appearance.style")}</p>
      <div className="grid grid-cols-2 gap-3">
        {styles.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setStyle(key)}
            className={cx(
              "flex flex-col items-center gap-2 rounded-xl border p-4 text-body-sm font-medium transition-colors",
              style === key
                ? "border-success bg-success/10 text-success"
                : "border-border text-text-secondary hover:bg-surface-hover"
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-caption text-text-muted">{t("appearance.styleHint")}</p>
    </div>
  );
}
