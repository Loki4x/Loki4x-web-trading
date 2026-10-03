"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Receipt, BellRing, Radio, BarChart3, Newspaper } from "lucide-react";
import { Switch } from "@/components/ui/Switch";
import { updateNotificationPrefs } from "@/app/(dashboard)/settings/actions";
import type { Profile } from "@/lib/types";
import { useT } from "@/lib/i18n/client";

export function NotificationsPanel({ profile }: { profile: Profile | null }) {
  const t = useT();
  const router = useRouter();
  const [notifyReceipts, setNotifyReceipts] = useState(profile?.notify_receipts ?? true);
  const [notifyExpiry, setNotifyExpiry] = useState(profile?.notify_expiry ?? true);
  const [notifySignals, setNotifySignals] = useState(profile?.notify_signals ?? true);
  const [notifyWeekly, setNotifyWeekly] = useState(profile?.notify_weekly ?? true);
  const [notifyNews, setNotifyNews] = useState(profile?.notify_news ?? true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function save(next: { notifyReceipts?: boolean; notifyExpiry?: boolean; notifySignals?: boolean; notifyWeekly?: boolean; notifyNews?: boolean }) {
    setSaving(true);
    setMessage(null);
    const formData = new FormData();
    formData.set("notify_receipts", String(next.notifyReceipts ?? notifyReceipts));
    formData.set("notify_expiry", String(next.notifyExpiry ?? notifyExpiry));
    formData.set("notify_signals", String(next.notifySignals ?? notifySignals));
    formData.set("notify_weekly", String(next.notifyWeekly ?? notifyWeekly));
    formData.set("notify_news", String(next.notifyNews ?? notifyNews));
    const result = await updateNotificationPrefs(formData);
    setSaving(false);
    if (result.success) {
      setMessage({ type: "success", text: t("notif.saved") });
      router.refresh();
    } else {
      setMessage({ type: "error", text: result.message });
    }
  }

  return (
    <div className="card !p-6">
      <h2 className="text-h3 text-text-primary">{t("notif.title")}</h2>
      <p className="mb-5 text-body-sm text-text-secondary">{t("notif.subtitle")}</p>

      <div className="flex flex-col divide-y divide-border">
        <div className="flex items-start justify-between gap-4 py-4 first:pt-0">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="flex items-center gap-2 text-body-sm font-semibold text-text-primary">
                {t("notif.security")}
                <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                  {t("notif.alwaysOn")}
                </span>
              </p>
              <p className="text-caption text-text-muted">
                {t("notif.securityDesc")}
              </p>
            </div>
          </div>
          <Switch checked disabled label={t("notif.security")} />
        </div>

        <div className="flex items-start justify-between gap-4 py-4">
          <div className="flex gap-3">
            <Radio className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-body-sm font-semibold text-text-primary">{t("Notifikasi sinyal trading")}</p>
              <p className="text-caption text-text-muted">
                {t("Email saat ada sinyal baru, update sinyal, dan sinyal ditutup. Khusus member VIP dan Membership.")}
              </p>
            </div>
          </div>
          <Switch
            checked={notifySignals}
            onChange={(v) => {
              setNotifySignals(v);
              save({ notifySignals: v });
            }}
            label={t("Notifikasi sinyal trading")}
          />
        </div>

        <div className="flex items-start justify-between gap-4 py-4">
          <div className="flex gap-3">
            <BarChart3 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-body-sm font-semibold text-text-primary">{t("Laporan mingguan")}</p>
              <p className="text-caption text-text-muted">
                {t("Ringkasan performa trading dan sinyal setiap Sabtu pagi lewat email.")}
              </p>
            </div>
          </div>
          <Switch
            checked={notifyWeekly}
            onChange={(v) => {
              setNotifyWeekly(v);
              save({ notifyWeekly: v });
            }}
            label={t("Laporan mingguan")}
          />
        </div>

        <div className="flex items-start justify-between gap-4 py-4">
          <div className="flex gap-3">
            <Newspaper className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-body-sm font-semibold text-text-primary">{t("Pengingat berita high-impact")}</p>
              <p className="text-caption text-text-muted">
                {t("Notifikasi di web sebelum berita high-impact rilis. Khusus member Membership.")}
              </p>
            </div>
          </div>
          <Switch
            checked={notifyNews}
            onChange={(v) => {
              setNotifyNews(v);
              save({ notifyNews: v });
            }}
            label={t("Pengingat berita high-impact")}
          />
        </div>

        <div className="flex items-start justify-between gap-4 py-4">
          <div className="flex gap-3">
            <Receipt className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-body-sm font-semibold text-text-primary">{t("notif.receipts")}</p>
              <p className="text-caption text-text-muted">{t("notif.receiptsDesc")}</p>
            </div>
          </div>
          <Switch
            checked={notifyReceipts}
            onChange={(v) => {
              setNotifyReceipts(v);
              save({ notifyReceipts: v });
            }}
            label={t("notif.receipts")}
          />
        </div>

        <div className="flex items-start justify-between gap-4 py-4 last:pb-0">
          <div className="flex gap-3">
            <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-body-sm font-semibold text-text-primary">{t("notif.expiry")}</p>
              <p className="text-caption text-text-muted">
                {t("notif.expiryDesc")}
              </p>
            </div>
          </div>
          <Switch
            checked={notifyExpiry}
            onChange={(v) => {
              setNotifyExpiry(v);
              save({ notifyExpiry: v });
            }}
            label={t("notif.expiry")}
          />
        </div>
      </div>

      {message && (
        <p className={`mt-4 text-body-sm ${message.type === "success" ? "text-success" : "text-error"}`}>
          {message.text}
        </p>
      )}
      {saving && <p className="mt-4 text-body-sm text-text-muted">{t("common.saving")}</p>}
    </div>
  );
}
