"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { cx } from "@/lib/utils";

const STORAGE_KEY = "loki4x-theme";
type ThemeMode = "light" | "dark" | "system";

function applyTheme(mode: ThemeMode) {
  const resolved =
    mode === "system"
      ? window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark"
      : mode;
  document.documentElement.setAttribute("data-theme", resolved);
}

export function AppearancePanel() {
  const [mode, setMode] = useState<ThemeMode | null>(null);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {
      // localStorage nggak tersedia
    }
    setMode(saved === "light" || saved === "dark" ? saved : "system");
  }, []);

  useEffect(() => {
    if (!mode) return;
    applyTheme(mode);

    if (mode !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [mode]);

  function choose(next: ThemeMode) {
    setMode(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // diamkan — tema tetap kepakai, cuma nggak diingat lain kali
    }
  }

  const options: { key: ThemeMode; label: string; icon: typeof Sun }[] = [
    { key: "light", label: "Terang", icon: Sun },
    { key: "dark", label: "Gelap", icon: Moon },
    { key: "system", label: "Sistem", icon: Monitor },
  ];

  return (
    <div className="card !p-6">
      <h2 className="text-h3 text-text-primary">Tampilan</h2>
      <p className="mb-5 text-body-sm text-text-secondary">Perubahan berlaku secara instan dan disimpan otomatis.</p>

      <p className="mb-3 text-caption font-semibold uppercase tracking-wide text-text-muted">Tema</p>
      <div className="grid grid-cols-3 gap-3">
        {options.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => choose(key)}
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
