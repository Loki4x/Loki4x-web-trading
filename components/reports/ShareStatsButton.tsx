"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { useT } from "@/lib/i18n/client";

/** Membuat gambar rekap bulanan dan membagikannya (lembar bagikan ponsel) atau mengunduhnya. */
export function ShareStatsButton({ month, accountId, disabled }: { month: string; accountId: string; disabled?: boolean }) {
  const t = useT();
  const [showPnl, setShowPnl] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function share() {
    setBusy(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ month, account: accountId });
      if (showPnl) qs.set("pnl", "1");
      const res = await fetch(`/api/share/stats?${qs.toString()}`);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const file = new File([blob], `loki4x-rekap-${month}.png`, { type: "image/png" });

      if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "Loki4x Academy" });
          return;
        } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") return; // user menutup lembar bagikan
        }
      }
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(href), 5000);
    } catch {
      setError(t("Gagal membuat gambar. Coba lagi."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button
        type="button"
        onClick={share}
        disabled={busy || disabled}
        className="btn-secondary btn-fx !px-4 !py-2 text-body-sm"
        title={disabled ? t("Belum ada trade tertutup di bulan ini") : undefined}
      >
        <Share2 className="h-4 w-4" />
        {busy ? t("Membuat gambar...") : t("Bagikan rekap bulan ini")}
      </button>
      <label className="flex items-center gap-2 text-caption text-text-muted">
        <input type="checkbox" checked={showPnl} onChange={(e) => setShowPnl(e.target.checked)} className="accent-primary" />
        {t("Tampilkan nominal P&L")}
      </label>
      {error && <p className="text-caption text-error">{error}</p>}
    </div>
  );
}
