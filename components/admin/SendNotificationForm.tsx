"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { sendAdminNotification } from "@/app/admin/actions";
import { useT } from "@/lib/i18n/client";

type Audience = "ALL" | "FREE" | "VIP" | "MEMBERSHIP";

export function SendNotificationForm() {
  const t = useT();
  const [target, setTarget] = useState<"ALL" | "SPECIFIC">("ALL");
  const [audience, setAudience] = useState<Audience>("ALL");
  const [website, setWebsite] = useState(true);
  const [email, setEmail] = useState(false);
  const [push, setPush] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setSending(true);
    setResult(null);
    formData.set("target", target);
    formData.set("audience", audience);
    formData.set("ch_website", String(website));
    formData.set("ch_email", String(email));
    formData.set("ch_push", String(push));
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

      {target === "ALL" && (
        <div className="flex flex-col gap-2">
          <label className="text-body-sm font-medium text-text-secondary">{t("Kirim ke tier")}</label>
          <select value={audience} onChange={(e) => setAudience(e.target.value as Audience)} className="input-field">
            <option value="ALL">{t("Semua tier")}</option>
            <option value="FREE">Free</option>
            <option value="VIP">VIP</option>
            <option value="MEMBERSHIP">Membership</option>
          </select>
        </div>
      )}

      {target === "SPECIFIC" && <Input name="email" type="email" label="Email User" placeholder="user@example.com" required />}

      <div className="flex flex-col gap-2">
        <label className="text-body-sm font-medium text-text-secondary">{t("Kirim melalui")}</label>
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <label className="flex items-center gap-2 text-body-sm text-text-primary">
            <input type="checkbox" checked={push} onChange={(e) => setPush(e.target.checked)} className="h-4 w-4" />
            {t("Push (bilah notifikasi HP)")}
          </label>
          <label className="flex items-center gap-2 text-body-sm text-text-primary">
            <input type="checkbox" checked={website} onChange={(e) => setWebsite(e.target.checked)} className="h-4 w-4" />
            {t("Notifikasi Website")}
          </label>
          <label className="flex items-center gap-2 text-body-sm text-text-primary">
            <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} className="h-4 w-4" />
            {t("Email")}
          </label>
        </div>
        <p className="text-caption text-text-muted">{t("Push hanya sampai ke anggota yang sudah mengaktifkannya di perangkat.")}</p>
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
