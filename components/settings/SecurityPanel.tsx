"use client";

import { useState } from "react";
import { Monitor } from "lucide-react";
import { changePassword } from "@/app/(dashboard)/settings/actions";
import { parseUserAgent } from "@/lib/login-activity";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { formatDate, formatTime } from "@/lib/utils";
import type { LoginActivity } from "@/lib/types";

export function SecurityPanel({
  loginActivity,
  currentDevice,
  currentIp,
}: {
  loginActivity: LoginActivity[];
  currentDevice: { browser: string; os: string };
  currentIp: string;
}) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [signOutOthers, setSignOutOthers] = useState(true);
  const [formKey, setFormKey] = useState(0);

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    setMessage(null);
    const result = await changePassword(formData);
    setSaving(false);
    if (result.success) {
      setMessage({ type: "success", text: "Kata sandi berhasil diubah." });
      setFormKey((k) => k + 1); // reset form fields
    } else {
      setMessage({ type: "error", text: result.message });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="card !p-6">
        <h2 className="text-h3 text-text-primary">Ubah kata sandi</h2>
        <p className="mb-5 text-body-sm text-text-secondary">
          Pastikan kata sandi baru berbeda dari yang lama dan cukup kuat.
        </p>

        <form key={formKey} action={handleSubmit} className="flex flex-col gap-4">
          <Input name="current_password" type="password" label="Kata sandi saat ini" required />
          <Input name="new_password" type="password" label="Kata sandi baru" required />
          <Input name="confirm_password" type="password" label="Konfirmasi kata sandi baru" required />

          <label className="flex items-center gap-3">
            <Switch checked={signOutOthers} onChange={setSignOutOthers} label="Keluar dari semua sesi lain" />
            <input type="hidden" name="sign_out_others" value={signOutOthers ? "on" : ""} />
            <span className="text-body-sm text-text-secondary">Keluar dari semua sesi lain</span>
          </label>

          {message && (
            <p className={`text-body-sm ${message.type === "success" ? "text-success" : "text-error"}`}>
              {message.text}
            </p>
          )}

          <Button type="submit" disabled={saving} className="w-fit">
            {saving ? "Menyimpan..." : "Ubah kata sandi"}
          </Button>
        </form>
      </div>

      <div className="card !p-6">
        <h3 className="mb-4 text-body font-semibold text-text-primary">Perangkat ini</h3>
        <div className="flex items-center gap-3 rounded-lg border border-border p-4">
          <Monitor className="h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-body-sm font-medium text-text-primary">
              {currentDevice.browser}
              {currentDevice.os ? ` · ${currentDevice.os}` : ""}
              <span className="ml-2 rounded-full bg-primary-subtle px-2 py-0.5 text-caption font-semibold text-primary">
                Perangkat ini
              </span>
            </p>
            <p className="text-caption text-text-muted">
              {currentIp || "IP tidak diketahui"} · Sekarang aktif
            </p>
          </div>
        </div>
      </div>

      <div className="card !p-6">
        <h3 className="mb-4 text-body font-semibold text-text-primary">Aktivitas masuk terbaru</h3>
        {loginActivity.length === 0 ? (
          <p className="text-body-sm text-text-muted">Belum ada riwayat aktivitas masuk.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {loginActivity.map((entry) => {
              const { browser, os } = parseUserAgent(entry.user_agent);
              return (
                <div key={entry.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-body-sm font-medium text-text-primary">
                      {formatDate(entry.created_at)}, {formatTime(entry.created_at)}
                    </p>
                    <p className="text-caption text-text-muted">
                      {entry.ip || "IP tidak diketahui"} · {browser}
                      {os ? ` · ${os}` : ""}
                    </p>
                  </div>
                  <span className="rounded-full bg-success-subtle px-2.5 py-1 text-caption font-semibold text-success">
                    Berhasil
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
