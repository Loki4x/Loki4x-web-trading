"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/app/(dashboard)/settings/actions";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { Profile } from "@/lib/types";

function initials(name: string | null) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "U";
}

export function ProfilePanel({ profile, isGoogleUser }: { profile: Profile | null; isGoogleUser: boolean }) {
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
      setMessage({ type: "success", text: "Profil berhasil disimpan." });
      router.refresh();
    } else {
      setMessage({ type: "error", text: result.message });
    }
  }

  return (
    <div className="card !p-6">
      <h2 className="text-h3 text-text-primary">Profil</h2>
      <p className="mb-5 text-body-sm text-text-secondary">Identitas publik Anda di Loki4x Academy.</p>

      <div className="mb-6 flex items-center gap-4">
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.full_name ?? "Foto profil"}
            className="h-16 w-16 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-h3 font-semibold text-text-on-primary">
            {initials(profile?.full_name ?? null)}
          </div>
        )}
        <div>
          <p className="text-body-sm font-semibold text-text-primary">Foto profil</p>
          <p className="text-caption text-text-muted">
            {isGoogleUser
              ? "Diambil otomatis dari akun Google Anda."
              : "Login dengan Google untuk otomatis pakai foto profil Google Anda."}
          </p>
        </div>
      </div>

      <form action={handleSubmit} className="flex flex-col gap-4">
        <Input
          name="full_name"
          label="Nama tampilan"
          placeholder="Nama Anda"
          defaultValue={profile?.full_name ?? ""}
        />

        <Input
          name="username"
          label="Username"
          placeholder="username_unik"
          defaultValue={profile?.username ?? ""}
        />

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-body-sm font-medium text-text-secondary">Bio</label>
            <span className="text-caption text-text-muted">{bioLength}/160</span>
          </div>
          <textarea
            name="bio"
            rows={3}
            maxLength={160}
            defaultValue={profile?.bio ?? ""}
            onChange={(e) => setBioLength(e.target.value.length)}
            placeholder="Bio singkat tentang diri Anda"
            className="input-field resize-none"
          />
        </div>

        {message && (
          <p className={`text-body-sm ${message.type === "success" ? "text-success" : "text-error"}`}>
            {message.text}
          </p>
        )}

        <Button type="submit" disabled={saving} className="mt-2 w-fit">
          {saving ? "Menyimpan..." : "Simpan perubahan"}
        </Button>
      </form>
    </div>
  );
}
