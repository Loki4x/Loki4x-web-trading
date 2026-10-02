"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { sendAdminNotification } from "@/app/admin/actions";
import { useT } from "@/lib/i18n/client";

export function SendNotificationForm() {
  const t = useT();
  const [target, setTarget] = useState<"ALL" | "SPECIFIC">("ALL");
  const [channel, setChannel] = useState<"BOTH" | "EMAIL" | "WEBSITE">("BOTH");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setSending(true);
    setResult(null);
    formData.set("target", target);
    formData.set("channel", channel);
    const res = await sendAdminNotification(formData);
    setResult(res.message);
    setSending(false);
  }

  return (
    <form action={handleSubmit} className="card flex max-w-lg flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-body-sm font-medium text-text-secondary">{t("Kirim ke")}</label>
        <select value={target} onChange={(e) => setTarget(e.target.value as "ALL" | "SPECIFIC")} className="input-field">
          <option value="ALL">{t("Semua User")}</option>
          <option value="SPECIFIC">{t("User Tertentu (by email)")}</option>
        </select>
      </div>

      {target === "SPECIFIC" && <Input name="email" type="email" label="Email User" placeholder="user@example.com" required />}

      <div className="flex flex-col gap-2">
        <label className="text-body-sm font-medium text-text-secondary">{t("Kirim melalui")}</label>
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value as "BOTH" | "EMAIL" | "WEBSITE")}
          className="input-field"
        >
          <option value="BOTH">{t("Email & Notifikasi Website")}</option>
          <option value="EMAIL">{t("Email saja")}</option>
          <option value="WEBSITE">{t("Notifikasi Website saja")}</option>
        </select>
      </div>

      <Input name="title" type="text" label={t("Judul")} placeholder={t("Pengumuman Penting")} required />

      <div className="flex flex-col gap-2">
        <label className="text-body-sm font-medium text-text-secondary">{t("Pesan")}</label>
        <textarea name="message" rows={4} className="input-field" required />
      </div>

      {result && <p className="text-body-sm text-text-secondary">{result}</p>}

      <Button type="submit" loading={sending} withArrow className="w-full justify-center">
        {t("Kirim Notifikasi")}
      </Button>
    </form>
  );
}
