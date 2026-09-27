"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { updateSignalStatus } from "@/app/admin/actions";
import { SIGNAL_STATUS_LABEL } from "@/lib/signal-metrics";
import type { Signal, SignalStatus } from "@/lib/types";

const STATUS_OPTIONS: SignalStatus[] = ["OPEN", "HIT_ENTRY", "TP", "SL", "PARTIAL", "CANCEL", "MISS"];
const NEEDS_RESULT: SignalStatus[] = ["TP", "SL", "PARTIAL"];

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
  const router = useRouter();
  const [status, setStatus] = useState<SignalStatus>(signal.status);

  const needsResult = NEEDS_RESULT.includes(status);
  const autoPrice = resolveClosingPrice(status, signal);

  async function handleSubmit(formData: FormData) {
    let closingPrice: number | null = null;
    let resultPips: number | null = null;

    if (needsResult) {
      const priceRaw = formData.get("closing_price");
      closingPrice = priceRaw ? Number(priceRaw) : null;
      const pipsRaw = formData.get("result_pips");
      resultPips = pipsRaw ? Number(pipsRaw) : 0;
    }

    await updateSignalStatus(signal.id, status, closingPrice, resultPips);
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-h3 text-text-primary">
            Update Status — {signal.symbol}
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form action={handleSubmit} className="flex flex-col gap-4">
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
            <>
              <Input
                key={`${status}-price`}
                name="closing_price"
                type="number"
                step="0.00001"
                label="Harga Penutupan"
                defaultValue={autoPrice ?? signal.entry_price}
                required
              />
              <Input
                key={`${status}-pips`}
                name="result_pips"
                type="number"
                step="0.1"
                label="Hasil (pips, boleh minus untuk loss)"
                placeholder="e.g. 25 atau -10"
                defaultValue={signal.result_pips ?? ""}
              />
            </>
          )}

          <Button type="submit" withArrow className="mt-2 w-full justify-center">
            Simpan
          </Button>
        </form>
      </div>
    </div>
  );
}
