"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { addSignalUpdate } from "@/app/admin/actions";
import { SIGNAL_UPDATE_LABEL } from "@/components/signals/SignalTimeline";
import type { Signal, SignalUpdateType } from "@/lib/types";
import { useT } from "@/lib/i18n/client";

const TYPES: SignalUpdateType[] = ["SL_TO_BE", "PARTIAL_CLOSE", "MOVE_SL", "MOVE_TP", "NOTE"];
const NEEDS_PRICE: SignalUpdateType[] = ["PARTIAL_CLOSE", "MOVE_SL", "MOVE_TP"];

export function AddSignalUpdateModal({ signal, onClose }: { signal: Signal; onClose: () => void }) {
  const t = useT();
  const router = useRouter();
  const [type, setType] = useState<SignalUpdateType>("SL_TO_BE");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const formData = new FormData(e.currentTarget);
    formData.set("signal_id", signal.id);
    formData.set("type", type);

    setPending(true);
    setError(null);
    const result = await addSignalUpdate(formData);
    setPending(false);

    if (!result.ok) {
      setError(result.message ?? t("Terjadi kesalahan."));
      return;
    }
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-surface p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-h3 text-text-primary">
            {t("Update Sinyal")} — {signal.symbol} {signal.side}
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary" aria-label={t("Tutup")}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-body-sm font-medium text-text-secondary">{t("Jenis update")}</label>
            <select value={type} onChange={(e) => setType(e.target.value as SignalUpdateType)} className="input-field">
              {TYPES.map((opt) => (
                <option key={opt} value={opt}>
                  {t(SIGNAL_UPDATE_LABEL[opt])}
                </option>
              ))}
            </select>
          </div>

          {NEEDS_PRICE.includes(type) && (
            <Input key={type} name="price" type="number" step="0.00001" label={t("Harga (opsional)")} />
          )}

          <div className="flex flex-col gap-2">
            <label className="text-body-sm font-medium text-text-secondary">{t("Pesan (opsional)")}</label>
            <textarea
              name="message"
              rows={3}
              maxLength={500}
              placeholder={t("Contoh: Harga sudah +30 pips, SL digeser ke entry.")}
              className="input-field resize-none"
            />
          </div>

          <label className="flex items-center gap-2 text-body-sm text-text-secondary">
            <input type="checkbox" name="send_email" value="1" defaultChecked className="h-4 w-4" />
            {t("Kirim email ke member yang notifikasinya aktif")}
          </label>

          {error && (
            <p className="rounded-lg border border-error/30 bg-error-subtle px-3 py-2 text-body-sm text-error">{error}</p>
          )}

          <Button type="submit" withArrow loading={pending} className="mt-2 w-full justify-center">
            {t("Simpan")}
          </Button>
        </form>
      </div>
    </div>
  );
}
