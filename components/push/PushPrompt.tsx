"use client";

import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { usePush } from "@/components/push/usePush";

const DISMISS_KEY = "loki4x-push-prompt-dismissed";

/** Ajakan di dashboard (VIP/Membership) untuk mengaktifkan notifikasi push sinyal. Hilang setelah aktif atau ditutup. */
export function PushPrompt() {
  const t = useT();
  const { status, busy, enable } = usePush();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (dismissed || status !== "off") return null;

  function close() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* penyimpanan browser diblokir: cukup sembunyikan untuk sesi ini */
    }
  }

  return (
    <div className="card mb-6 flex items-start gap-3 !p-4">
      <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <div className="flex-1">
        <p className="text-body-sm font-semibold text-text-primary">{t("Aktifkan notifikasi sinyal")}</p>
        <p className="text-caption text-text-secondary">
          {t("Dapat sinyal baru dan update langsung di bilah notifikasi perangkatmu, tanpa perlu membuka web.")}
        </p>
        <button onClick={() => enable()} disabled={busy} className="btn-primary mt-3 !px-4 !py-1.5 disabled:opacity-50">
          {t("Aktifkan notifikasi")}
        </button>
      </div>
      <button onClick={close} className="rounded-full p-1 text-text-muted hover:text-text-primary" aria-label={t("Tutup")}>
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
