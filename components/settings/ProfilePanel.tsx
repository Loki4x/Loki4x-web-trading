"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/app/(dashboard)/settings/actions";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { Profile } from "@/lib/types";
import { useT } from "@/lib/i18n/client";

function initials(name: string | null) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "U";
}

export function ProfilePanel({ profile, isGoogleUser }: { profile: Profile | null; isGoogleUser: boolean }) {
  const t = useT();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [bioLength, setBioLength] = useState(profile?.bio?.length ?? 0);

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    setMessage(null);
    const result = await updateProfile(formData);
    setSaving(false);
    if (result.success) {
      setMessage({ type: "success", text: t("profile.saved") });
      router.refresh();
    } else {
      setMessage({ type: "error", text: result.message });
    }
  }

  return (
    <div className="card !p-6">
      <h2 className="text-h3 text-text-primary">{t("profile.title")}</h2>
      <p className="mb-5 text-body-sm text-text-secondary">{t("profile.subtitle")}</p>

      <div className="mb-6 flex items-center gap-4">
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.full_name ?? t("profile.photoAlt")}
            className="h-16 w-16 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-h3 font-semibold text-text-on-primary">
            {initials(profile?.full_name ?? null)}
          </div>
        )}
        <div>
          <p className="text-body-sm font-semibold text-text-primary">{t("profile.photo")}</p>
          <p className="text-caption text-text-muted">
            {isGoogleUser
              ? t("profile.photoGoogle")
              : t("profile.photoNoGoogle")}
          </p>
        </div>
      </div>

      <form action={handleSubmit} className="flex flex-col gap-4">
        <Input
          name="full_name"
          label={t("profile.displayName")}
          placeholder={t("profile.displayNamePh")}
          defaultValue={profile?.full_name ?? ""}
        />

        <Input
          name="username"
          label="Username"
          placeholder={t("profile.usernamePh")}
          defaultValue={profile?.username ?? ""}
        />

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-body-sm font-medium text-text-secondary">{t("profile.bio")}</label>
            <span className="text-caption text-text-muted">{bioLength}/160</span>
          </div>
          <textarea
            name="bio"
            rows={3}
            maxLength={160}
            defaultValue={profile?.bio ?? ""}
            onChange={(e) => setBioLength(e.target.value.length)}
            placeholder={t("profile.bioPh")}
            className="input-field resize-none"
          />
        </div>

        {message && (
          <p className={`text-body-sm ${message.type === "success" ? "text-success" : "text-error"}`}>
            {message.text}
          </p>
        )}

        <Button type="submit" disabled={saving} className="mt-2 w-fit">
          {saving ? t("common.saving") : t("profile.save")}
        </Button>
      </form>
    </div>
  );
}
