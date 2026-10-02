"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateAccountPrefs } from "@/app/(dashboard)/settings/actions";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import { useLocale, useT } from "@/lib/i18n/client";

const TIMEZONES = [
  "Asia/Jakarta",
  "Asia/Makassar",
  "Asia/Jayapura",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Europe/London",
  "America/New_York",
  "UTC",
];

export function AccountPanel({
  profile,
  email,
  memberSince,
}: {
  profile: Profile | null;
  email: string;
  memberSince: string;
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [timezone, setTimezone] = useState(profile?.timezone ?? "Asia/Jakarta");
  const [now, setNow] = useState<string>("");

  useEffect(() => {
    function tick() {
      try {
        setNow(new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "id-ID", { timeZone: timezone, hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date()));
      } catch {
        setNow("");
      }
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timezone, locale]);

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    setMessage(null);
    const result = await updateAccountPrefs(formData);
    setSaving(false);
    if (result.success) {
      setMessage({ type: "success", text: t("account.saved") });
      router.refresh();
    } else {
      setMessage({ type: "error", text: result.message });
    }
  }

  return (
    <div className="card !p-6">
      <h2 className="text-h3 text-text-primary">{t("account.title")}</h2>
      <p className="mb-5 text-body-sm text-text-secondary">{t("account.subtitle")}</p>

      <form action={handleSubmit} className="flex flex-col gap-5">
        <Input label={t("account.email")} value={email} disabled className="cursor-not-allowed opacity-60" />
        <p className="-mt-3 text-caption text-text-muted">{t("account.emailHint")}</p>

        <div className="flex flex-col gap-2">
          <label className="text-body-sm font-medium text-text-secondary">{t("account.language")}</label>
          <select name="language" defaultValue={profile?.language ?? "id"} className="input-field">
            <option value="id">Bahasa Indonesia</option>
            <option value="en">English</option>
          </select>
          <p className="text-caption text-text-muted">{t("account.languageHint")}</p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-body-sm font-medium text-text-secondary">{t("account.timezone")}</label>
          <select
            name="timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="input-field"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
          {now && <p className="text-caption text-text-muted">{t("account.now", { time: now })}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-body-sm font-medium text-text-secondary">{t("account.type")}</label>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary-subtle px-1.5 py-0.5 text-badge font-semibold leading-none text-primary">
              {t(`account.tier.${profile?.tier ?? "FREE"}` as const)}
            </span>
            {memberSince && (
              <span className="text-caption text-text-muted">{t("account.memberSince", { date: formatDate(memberSince) })}</span>
            )}
          </div>
        </div>

        {message && (
          <p className={`text-body-sm ${message.type === "success" ? "text-success" : "text-error"}`}>
            {message.text}
          </p>
        )}

        <Button type="submit" disabled={saving} className="w-fit">
          {saving ? t("common.saving") : t("account.save")}
        </Button>
      </form>
    </div>
  );
}
