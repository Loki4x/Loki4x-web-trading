"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { updateSignalStatus } from "@/app/admin/actions";
import { nowWibInputValue } from "@/lib/utils";
import { SIGNAL_STATUS_LABEL } from "@/lib/signal-metrics";
import { SignalResultFields } from "@/components/admin/SignalResultFields";
import type { Signal, SignalStatus } from "@/lib/types";
import { useT } from "@/lib/i18n/client";

const STATUS_OPTIONS: SignalStatus[] = ["OPEN", "HIT_ENTRY", "TP", "SL", "PARTIAL", "CANCEL", "MISS"];
const NEEDS_RESULT: SignalStatus[] = ["TP", "SL", "PARTIAL"];
const TERMINAL: SignalStatus[] = ["TP", "SL", "PARTIAL", "CANCEL", "MISS"];

/**
 * Harga penutupan otomatis diambil dari Take Profit/Stop Loss kalau statusnya
 * TP/SL — admin tinggal konfirmasi, nggak perlu ngitung/nulis manual lagi.
 * PARTIAL tetap butuh input manual karena levelnya nggak tetap.
 */
function resolveClosingPrice(status: SignalStatus, signal: Signal): number | null {
  if (status === "TP") return signal.take_profit;
  if (status === "SL") return signal.stop_loss;
  return null;
}

export function UpdateSignalStatusModal({ signal, onClose }: { signal: Signal; onClose: () => void }) {
  const t = useT();
  const router = useRouter();
  const [status, setStatus] = useState<SignalStatus>(signal.status);
  const [pending, setPending] = useState(false);
  const [pipsBlocked, setPipsBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tanggal ditutup: kalau sinyal sudah pernah ditutup, pakai tanggal itu (supaya
  // mengedit nggak menggesernya ke hari ini); kalau belum, default sekarang.
  const [defaultClosedAt] = useState(() =>
    nowWibInputValue(signal.closed_at ? new Date(signal.closed_at) : new Date())
  );

  const needsResult = NEEDS_RESULT.includes(status);
  const isTerminal = TERMINAL.includes(status);
  const autoPrice = resolveClosingPrice(status, signal);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;

    if (needsResult && pipsBlocked) {
      setError("Hasil pips berbeda jauh dari hitungan harga. Perbaiki angkanya, atau centang konfirmasi di bawah kolom pips.");
      return;
    }
    const formData = new FormData(e.currentTarget);

    let closingPrice: number | null = null;
    let resultPips: number | null = null;

    if (needsResult) {
      const priceRaw = formData.get("closing_price");
      closingPrice = priceRaw ? Number(priceRaw) : null;
      const pipsRaw = formData.get("result_pips");
      resultPips = pipsRaw ? Number(pipsRaw) : 0;
    }

    const closedAtRaw = isTerminal ? String(formData.get("closed_at") ?? "") : "";

    setPending(true);
    setError(null);
    const result = await updateSignalStatus(signal.id, status, closingPrice, resultPips, closedAtRaw || null);
    setPending(false);

    if (!result.ok) {
      setError(result.message ?? "Gagal menyimpan.");
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
            Update Status — {signal.symbol}
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary" aria-label={t("Tutup")}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-body-sm font-medium text-text-secondary">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as SignalStatus)}
              className="input-field"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {SIGNAL_STATUS_LABEL[opt]}
                </option>
              ))}
            </select>
          </div>

          {needsResult && (
            <SignalResultFields
              key={status}
              symbol={signal.symbol}
              side={signal.side}
              entry={signal.entry_price}
              takeProfit={signal.take_profit}
              stopLoss={signal.stop_loss}
              status={status}
              closingLabel={t("Harga Penutupan")}
              closingRequired
              defaultClosing={String(autoPrice ?? signal.entry_price)}
              // Pips lama hanya dipertahankan untuk status yang sama; ganti status = hitung ulang dari harga.
              defaultPips={status === signal.status && signal.result_pips !== null ? String(signal.result_pips) : ""}
              onBlockedChange={setPipsBlocked}
            />
          )}

          {isTerminal && (
            <div>
              <Input
                name="closed_at"
                type="datetime-local"
                label={t("Tanggal & jam ditutup (WIB)")}
                defaultValue={defaultClosedAt}
                required
              />
              <p className="mt-1.5 text-caption text-text-muted">
                {t("Ubah kalau sinyal ini sebenarnya ditutup di tanggal lain (mis. memasukkan sinyal lama).")}
              </p>
            </div>
          )}

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
