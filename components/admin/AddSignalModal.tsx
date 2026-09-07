"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { addSignal } from "@/app/admin/actions";

export function AddSignalModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    await addSignal(formData);
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-h3 text-text-primary">Post Signal</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form action={handleSubmit} className="flex flex-col gap-4">
          <Input name="symbol" label="Symbol" placeholder="XAUUSD" required />

          <div className="flex flex-col gap-2">
            <label className="text-body-sm font-medium text-text-secondary">Side</label>
            <select name="side" required className="input-field" defaultValue="BUY">
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </select>
          </div>

          <Input name="entry_price" type="number" step="0.00001" label="Entry Price" required />

          <div className="grid grid-cols-2 gap-4">
            <Input name="take_profit" type="number" step="0.00001" label="Take Profit (optional)" />
            <Input name="stop_loss" type="number" step="0.00001" label="Stop Loss (optional)" />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-body-sm font-medium text-text-secondary">Notes (optional)</label>
            <textarea name="notes" rows={3} className="input-field resize-none" placeholder="Alasan/setup sinyal..." />
          </div>

          <Button type="submit" withArrow className="mt-2 w-full justify-center">
            Post Signal
          </Button>
        </form>
      </div>
    </div>
  );
}
