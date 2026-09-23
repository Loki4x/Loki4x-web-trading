"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateAccountPrefs } from "@/app/(dashboard)/settings/actions";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import type { Profile } from "@/lib/types";

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

const TIER_LABEL: Record<Profile["tier"], string> = {
  FREE: "Gratis",
  VIP: "VIP",
  MEMBERSHIP: "Membership",
};

export function AccountPanel({
  profile,
  email,
  memberSince,
}: {
  profile: Profile | null;
  email: string;
  memberSince: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [timezone, setTimezone] = useState(profile?.timezone ?? "Asia/Jakarta");
  const [now, setNow] = useState<string>("");

  useEffect(() => {
    function tick() {
      try {
        setNow(new Intl.DateTimeFormat("id-ID", { timeZone: timezone, hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date()));
      } catch {
        setNow("");
      }
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timezone]);

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    setMessage(null);
    const result = await updateAccountPrefs(formData);
    setSaving(false);
    if (result.success) {
      setMessage({ type: "success", text: "Pengaturan akun disimpan." });
      router.refresh();
    } else {
      setMessage({ type: "error", text: result.message });
    }
  }

  return (
    <div className="card !p-6">
      <h2 className="text-h3 text-text-primary">Akun</h2>
      <p className="mb-5 text-body-sm text-text-secondary">Kelola kredensial masuk dan preferensi regional Anda.</p>

      <form action={handleSubmit} className="flex flex-col gap-5">
        <Input label="Alamat email" value={email} disabled className="cursor-not-allowed opacity-60" />
        <p className="-mt-3 text-caption text-text-muted">Email adalah identitas masuk Anda. Hubungi dukungan untuk mengubahnya.</p>

        <div className="flex flex-col gap-2">
          <label className="text-body-sm font-medium text-text-secondary">Bahasa</label>
          <select name="language" defaultValue={profile?.language ?? "id"} className="input-field">
            <option value="id">Bahasa Indonesia</option>
            <option value="en" disabled>
              English (segera hadir)
            </option>
          </select>
          <p className="text-caption text-text-muted">Fitur ini masih pajangan — belum mengubah bahasa antarmuka.</p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-body-sm font-medium text-text-secondary">Zona waktu</label>
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
          {now && <p className="text-caption text-text-muted">Sekarang: {now}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-body-sm font-medium text-text-secondary">Jenis akun</label>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary-subtle px-3 py-1 text-caption font-semibold text-primary">
              {TIER_LABEL[profile?.tier ?? "FREE"]}
            </span>
            {memberSince && (
              <span className="text-caption text-text-muted">Anggota sejak {formatDate(memberSince)}</span>
            )}
          </div>
        </div>

        {message && (
          <p className={`text-body-sm ${message.type === "success" ? "text-success" : "text-error"}`}>
            {message.text}
          </p>
        )}

        <Button type="submit" disabled={saving} className="w-fit">
          {saving ? "Menyimpan..." : "Simpan pengaturan akun"}
        </Button>
      </form>
    </div>
  );
}
