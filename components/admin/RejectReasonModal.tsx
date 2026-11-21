"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useT } from "@/lib/i18n/client";

const MAX = 500;

/** Dialog penolakan: admin menulis alasan (opsional) yang dikirim ke user lewat notifikasi, push & email. */
export function RejectReasonModal({
  title,
  subtitle,
  onCancel,
  onConfirm,
}: {
  title: string;
  subtitle?: string;
  onCancel: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const t = useT();
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    await onConfirm(reason.trim());
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-h3 text-text-primary">{title}</h2>
          <button onClick={onCancel} className="text-text-muted hover:text-text-primary" aria-label={t("Tutup")}>
            <X className="h-5 w-5" />
          </button>
        </div>
        {subtitle && <p className="mb-4 text-body-sm text-text-secondary">{subtitle}</p>}
        <label className="mb-2 block text-body-sm font-medium text-text-secondary">{t("Alasan penolakan (opsional)")}</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value.slice(0, MAX))}
          rows={4}
          className="input-field min-h-[96px] w-full resize-y"
          placeholder={t("Mis. bukti transfer tidak terbaca / nominal kurang / akun bukan di bawah IB kami")}
          autoFocus
        />
        <p className="mt-1 text-right text-caption text-text-muted">
          {reason.length}/{MAX}
        </p>
        <p className="mt-2 text-caption text-text-muted">{t("Alasan dikirim ke user lewat notifikasi, push, dan email.")}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} disabled={saving} className="btn-secondary">
            {t("Batal")}
          </button>
          <button onClick={submit} disabled={saving} className="rounded-lg bg-error px-4 py-2 font-semibold text-white hover:bg-error/90 disabled:opacity-60">
            {saving ? t("Menyimpan…") : t("Tolak")}
          </button>
        </div>
      </div>
    </div>
  );
}
