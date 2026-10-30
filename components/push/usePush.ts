"use client";

import { useCallback, useEffect, useState } from "react";
import { removePushSubscription, savePushSubscription } from "@/app/(dashboard)/push/actions";

export type PushStatus = "loading" | "unsupported" | "unconfigured" | "denied" | "off" | "on";
export type PushError = "denied" | "failed" | null;

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function keyToUint8Array(base64Url: string) {
  const padded = base64Url + "=".repeat((4 - (base64Url.length % 4)) % 4);
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Service worker hanya didaftarkan di production; jangan menunggu selamanya kalau belum ada. */
async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
  return Promise.race([navigator.serviceWorker.ready, timeout]);
}

/** Status & kontrol notifikasi push untuk perangkat/browser ini. */
export function usePush() {
  const [status, setStatus] = useState<PushStatus>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<PushError>(null);

  const refresh = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setStatus("unsupported");
      return;
    }
    if (!PUBLIC_KEY) {
      setStatus("unconfigured");
      return;
    }
    const reg = await getRegistration();
    if (!reg) {
      setStatus("unsupported");
      return;
    }
    const sub = await reg.pushManager.getSubscription();
    if (sub && Notification.permission === "granted") setStatus("on");
    else if (Notification.permission === "denied") setStatus("denied");
    else setStatus("off");
  }, []);

  useEffect(() => {
    refresh().catch(() => setStatus("unsupported"));
  }, [refresh]);

  const enable = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("denied");
        await refresh();
        return false;
      }
      const reg = await getRegistration();
      if (!reg) throw new Error("no service worker");
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToUint8Array(PUBLIC_KEY) }));
      const json = sub.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error("langganan tidak lengkap");
      const res = await savePushSubscription(
        { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } },
        navigator.userAgent
      );
      if (!res.ok) throw new Error(res.error);
      setStatus("on");
      return true;
    } catch (err) {
      console.error("[push] gagal mengaktifkan:", err);
      setError("failed");
      return false;
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const disable = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const reg = await getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("off");
    } catch (err) {
      console.error("[push] gagal menonaktifkan:", err);
      setError("failed");
    } finally {
      setBusy(false);
    }
  }, []);

  return { status, busy, error, enable, disable };
}
