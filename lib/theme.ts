"use client";

import { useCallback, useEffect, useState } from "react";

export const THEME_STORAGE_KEY = "loki4x-theme";
export type ThemeMode = "light" | "dark" | "system";

const SYNC_EVENT = "loki4x:theme-mode";

function resolve(mode: ThemeMode): "light" | "dark" {
  if (mode !== "system") return mode;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function applyTheme(mode: ThemeMode) {
  document.documentElement.setAttribute("data-theme", resolve(mode));
}

function readSaved(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

/**
 * Pilihan tema (terang / gelap / ikuti sistem). Dipakai di Pengaturan dan di bagian bawah sidebar;
 * keduanya selalu sinkron lewat event window. `mode` bernilai null sampai komponen terpasang (hindari beda tampilan server/klien).
 */
export function useThemeMode(): [ThemeMode | null, (next: ThemeMode) => void] {
  const [mode, setModeState] = useState<ThemeMode | null>(null);

  useEffect(() => {
    setModeState(readSaved());
    const onSync = (e: Event) => setModeState((e as CustomEvent<ThemeMode>).detail);
    window.addEventListener(SYNC_EVENT, onSync);
    return () => window.removeEventListener(SYNC_EVENT, onSync);
  }, []);

  // Terapkan tema, dan kalau "ikuti sistem" pantau perubahan tema perangkat.
  useEffect(() => {
    if (!mode) return;
    applyTheme(mode);
    if (mode !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    try {
      if (next === "system") localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // penyimpanan browser tidak tersedia: tema tetap dipakai, hanya tidak diingat
    }
    window.dispatchEvent(new CustomEvent<ThemeMode>(SYNC_EVENT, { detail: next }));
  }, []);

  return [mode, setMode];
}

// ---------------------------------------------------------------------------
// Gaya tampilan: Normal (solid) atau Glassmorphism (kartu kaca transparan + blur di atas latar gradasi).
// Disimpan di browser, diterapkan lewat atribut data-style di <html> (lihat app/globals.css).
// ---------------------------------------------------------------------------

export const THEME_STYLE_KEY = "loki4x-theme-style";
export type ThemeStyle = "normal" | "glass";
const STYLE_SYNC_EVENT = "loki4x:theme-style";

export function applyThemeStyle(style: ThemeStyle) {
  if (style === "glass") document.documentElement.setAttribute("data-style", "glass");
  else document.documentElement.removeAttribute("data-style");
}

function readSavedStyle(): ThemeStyle {
  try {
    return localStorage.getItem(THEME_STYLE_KEY) === "glass" ? "glass" : "normal";
  } catch {
    return "normal";
  }
}

/** Pilihan gaya tampilan; semua pemakai (Pengaturan & sidebar) sinkron lewat event window. */
export function useThemeStyle(): [ThemeStyle | null, (next: ThemeStyle) => void] {
  const [style, setStyleState] = useState<ThemeStyle | null>(null);

  useEffect(() => {
    setStyleState(readSavedStyle());
    const onSync = (e: Event) => setStyleState((e as CustomEvent<ThemeStyle>).detail);
    window.addEventListener(STYLE_SYNC_EVENT, onSync);
    return () => window.removeEventListener(STYLE_SYNC_EVENT, onSync);
  }, []);

  useEffect(() => {
    if (style) applyThemeStyle(style);
  }, [style]);

  const setStyle = useCallback((next: ThemeStyle) => {
    setStyleState(next);
    try {
      if (next === "glass") localStorage.setItem(THEME_STYLE_KEY, "glass");
      else localStorage.removeItem(THEME_STYLE_KEY);
    } catch {
      // penyimpanan browser tidak tersedia: gaya tetap dipakai, hanya tidak diingat
    }
    window.dispatchEvent(new CustomEvent<ThemeStyle>(STYLE_SYNC_EVENT, { detail: next }));
  }, []);

  return [style, setStyle];
}
