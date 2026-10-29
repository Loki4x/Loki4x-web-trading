"use client";

import { useEffect } from "react";

/** Mendaftarkan service worker (hanya di production) supaya web bisa dipasang sebagai aplikasi. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
      console.warn("[pwa] service worker gagal didaftarkan:", err);
    });
  }, []);
  return null;
}
