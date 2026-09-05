"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { updateUserTier } from "@/app/admin/actions";
import type { Profile } from "@/lib/types";

export function ChangeTierModal({ user, onClose }: { user: Profile; onClose: () => void }) {
  const router = useRouter();
  const [tier, setTier] = useState<"FREE" | "VIP">(user.tier);
  const [expiresAt, setExpiresAt] = useState(user.vip_expires_at?.slice(0, 10) ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await updateUserTier(user.id, tier, tier === "VIP" ? expiresAt || null : null);
    router.refresh();
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-h3 text-text-primary">Change Tier</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-body-sm text-text-secondary">
          {user.full_name || user.email}
        </p>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-body-sm font-medium text-text-secondary">Tier</label>
            <select value={tier} onChange={(e) => setTier(e.target.value as "FREE" | "VIP")} className="input-field">
              <option value="FREE">FREE</option>
              <option value="VIP">VIP</option>
            </select>
          </div>

          {tier === "VIP" && (
            <div className="flex flex-col gap-2">
              <label className="text-body-sm font-medium text-text-secondary">VIP Expires On (optional)</label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="input-field"
              />
            </div>
          )}

          <Button onClick={handleSave} loading={saving} withArrow className="mt-2 w-full justify-center">
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
