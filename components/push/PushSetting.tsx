"use client";

import { useState } from "react";
import { Smartphone } from "lucide-react";
import { Switch } from "@/components/ui/Switch";
import { useT } from "@/lib/i18n/client";
import { usePush } from "@/components/push/usePush";
import { sendTestPush } from "@/app/(dashboard)/push/actions";

/** Baris pengaturan "Notifikasi push di perangkat ini" (di Settings → Notifikasi). */
export function PushSetting() {
  const t = useT();
  const { status, busy, error, enable, disable } = usePush();
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  async function handleTest() {
    setTesting(true);
    setTestMsg(null);
    const res = await sendTestPush();
    setTesting(false);
    setTestMsg(res.ok ? t("Notifikasi tes dikirim. Cek bilah notifikasi perangkatmu.") : t("Gagal mengirim notifikasi tes."));
  }

  let hint: string | null = null;
  if (status === "unsupported") hint = t("Perangkat atau browser ini belum mendukung notifikasi push.");
  else if (status === "unconfigured") hint = t("Notifikasi push belum disiapkan oleh admin.");
  else if (status === "denied" || error === "denied")
    hint = t("Izin notifikasi diblokir. Aktifkan lewat pengaturan situs atau aplikasi di perangkatmu, lalu muat ulang.");
  else if (error === "failed") hint = t("Gagal mengaktifkan notifikasi push. Coba lagi.");

  const disabled = busy || status === "loading" || status === "unsupported" || status === "unconfigured" || status === "denied";

  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="flex gap-3">
        <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <p className="text-body-sm font-semibold text-text-primary">{t("Notifikasi push di perangkat ini")}</p>
          <p className="text-caption text-text-muted">
            {t("Sinyal baru, update, dan sinyal ditutup muncul langsung di bilah notifikasi, bahkan saat aplikasi ditutup. Aktifkan di tiap perangkat yang kamu pakai.")}
          </p>
          {hint && <p className="mt-1 text-caption text-warning">{hint}</p>}
          {status === "on" && (
            <div className="mt-2 flex items-center gap-3">
              <button onClick={handleTest} disabled={testing} className="text-caption font-medium text-primary hover:text-primary-hover disabled:opacity-50">
                {testing ? t("Mengirim...") : t("Kirim notifikasi tes")}
              </button>
              {testMsg && <span className="text-caption text-text-secondary">{testMsg}</span>}
            </div>
          )}
        </div>
      </div>
      <Switch
        checked={status === "on"}
        disabled={disabled}
        onChange={(v) => (v ? enable() : disable())}
        label={t("Notifikasi push di perangkat ini")}
      />
    </div>
  );
}
