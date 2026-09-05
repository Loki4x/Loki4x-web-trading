"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { addTrade } from "@/app/(dashboard)/trades/actions";

export function AddTradeModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    await addTrade(formData);
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-h3 text-text-primary">Add Manual Trade</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form action={handleSubmit} className="flex flex-col gap-4">
          <Input name="symbol" label="Symbol" placeholder="XAUUSD" required />

          <div className="flex flex-col gap-2">
            <label className="text-body-sm font-medium text-text-secondary">Side</label>
            <select name="side" required className="input-field" defaultValue="LONG">
              <option value="LONG">LONG</option>
              <option value="SHORT">SHORT</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input name="entry_price" type="number" step="0.00001" label="Entry Price" required />
            <Input name="exit_price" type="number" step="0.00001" label="Exit Price (optional)" />
          </div>

          <Input name="trade_date" type="date" label="Trade Date" required defaultValue={new Date().toISOString().slice(0, 10)} />

          <div className="flex flex-col gap-2">
            <label className="text-body-sm font-medium text-text-secondary">Notes</label>
            <textarea name="notes" rows={3} className="input-field resize-none" placeholder="Setup, reasoning, lessons..." />
          </div>

          <Button type="submit" withArrow className="mt-2 w-full justify-center">
            Save Trade
          </Button>
        </form>
      </div>
    </div>
  );
}
