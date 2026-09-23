"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Receipt, BellRing } from "lucide-react";
import { Switch } from "@/components/ui/Switch";
import { updateNotificationPrefs } from "@/app/(dashboard)/settings/actions";
import type { Profile } from "@/lib/types";

export function NotificationsPanel({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const [notifyReceipts, setNotifyReceipts] = useState(profile?.notify_receipts ?? true);
  const [notifyExpiry, setNotifyExpiry] = useState(profile?.notify_expiry ?? true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function save(next: { notifyReceipts?: boolean; notifyExpiry?: boolean }) {
    setSaving(true);
    setMessage(null);
    const formData = new FormData();
    formData.set("notify_receipts", String(next.notifyReceipts ?? notifyReceipts));
    formData.set("notify_expiry", String(next.notifyExpiry ?? notifyExpiry));
    const result = await updateNotificationPrefs(formData);
    setSaving(false);
    if (result.success) {
      setMessage({ type: "success", text: "Preferensi notifikasi disimpan." });
      router.refresh();
    } else {
      setMessage({ type: "error", text: result.message });
    }
  }

  return (
    <div className="card !p-6">
      <h2 className="text-h3 text-text-primary">Notifikasi</h2>
      <p className="mb-5 text-body-sm text-text-secondary">Atur notifikasi apa saja yang Anda terima lewat email.</p>

      <div className="flex flex-col divide-y divide-border">
        <div className="flex items-start justify-between gap-4 py-4 first:pt-0">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="flex items-center gap-2 text-body-sm font-semibold text-text-primary">
                Keamanan & masuk
                <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                  Selalu aktif
                </span>
              </p>
              <p className="text-caption text-text-muted">
                Kami mengirim email saat kata sandi Anda berubah atau ada login baru ke akun Anda. Demi keamanan, ini
                tidak bisa dinonaktifkan.
              </p>
            </div>
          </div>
          <Switch checked disabled label="Keamanan & masuk" />
        </div>

        <div className="flex items-start justify-between gap-4 py-4">
          <div className="flex gap-3">
            <Receipt className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-body-sm font-semibold text-text-primary">Kwitansi pembayaran</p>
              <p className="text-caption text-text-muted">Terima email kwitansi setiap kali upgrade berhasil.</p>
            </div>
          </div>
          <Switch
            checked={notifyReceipts}
            onChange={(v) => {
              setNotifyReceipts(v);
              save({ notifyReceipts: v });
            }}
            label="Kwitansi pembayaran"
          />
        </div>

        <div className="flex items-start justify-between gap-4 py-4 last:pb-0">
          <div className="flex gap-3">
            <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-body-sm font-semibold text-text-primary">Peringatan masa aktif Membership & VIP</p>
              <p className="text-caption text-text-muted">
                Dapat pengingat email menjelang dan saat masa Membership/VIP Anda habis.
              </p>
            </div>
          </div>
          <Switch
            checked={notifyExpiry}
            onChange={(v) => {
              setNotifyExpiry(v);
              save({ notifyExpiry: v });
            }}
            label="Peringatan masa aktif Membership & VIP"
          />
        </div>
      </div>

      {message && (
        <p className={`mt-4 text-body-sm ${message.type === "success" ? "text-success" : "text-error"}`}>
          {message.text}
        </p>
      )}
      {saving && <p className="mt-4 text-body-sm text-text-muted">Menyimpan...</p>}
    </div>
  );
}
