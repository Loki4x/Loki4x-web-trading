"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { updateTrade } from "@/app/(dashboard)/trades/actions";
import type { AccountCurrency, Trade } from "@/lib/types";

export function EditTradeModal({
  onClose,
  trade,
  accountCurrency = "USD",
}: {
  onClose: () => void;
  trade: Trade;
  accountCurrency?: AccountCurrency;
}) {
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    await updateTrade(trade.id, formData);
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-surface p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-h3 text-text-primary">Edit Trade</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form action={handleSubmit} className="flex flex-col gap-4">
          <input type="hidden" name="existing_before_photo_url" value={trade.before_photo_url ?? ""} />
          <input type="hidden" name="existing_after_photo_url" value={trade.after_photo_url ?? ""} />

          <Input name="symbol" label="Symbol" placeholder="XAUUSD" defaultValue={trade.symbol} required />

          <div className="flex flex-col gap-2">
            <label className="text-body-sm font-medium text-text-secondary">Side</label>
            <select name="side" required className="input-field" defaultValue={trade.side}>
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              name="entry_price"
              type="number"
              step="0.00001"
              label="Entry Price"
              defaultValue={trade.entry_price}
              required
            />
            <Input
              name="exit_price"
              type="number"
              step="0.00001"
              label="Exit Price (optional)"
              defaultValue={trade.exit_price ?? ""}
            />
          </div>

          <Input
            name="pips"
            type="number"
            step="0.1"
            label="Total Pips (optional)"
            placeholder="e.g. 25 or -10"
            defaultValue={trade.pips ?? ""}
          />

          <Input
            name="pnl_manual"
            type="number"
            step="0.01"
            label={`Profit/Loss (${accountCurrency === "IDR" ? "Rp" : "$"}) (optional)`}
            placeholder="e.g. 50 or -25.50"
            defaultValue={trade.pnl ?? ""}
          />

          <div className="flex flex-col gap-2">
            <label className="text-body-sm font-medium text-text-secondary">Confluence (Trade Reasoning)</label>
            <textarea
              name="confluence"
              rows={3}
              className="input-field resize-none"
              placeholder="Why did you take this trade? e.g. support/resistance, trend, news, indicator confirmation..."
              defaultValue={trade.confluence ?? ""}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-body-sm font-medium text-text-secondary">Session</label>
            <select name="session" className="input-field" defaultValue={trade.session ?? ""}>
              <option value="">Nggak diisi</option>
              <option value="LONDON">London</option>
              <option value="NEW_YORK">New York</option>
              <option value="ASIA">Asia</option>
              <option value="OVERLAP">Overlap</option>
            </select>
          </div>

          <Input name="trade_date" type="date" label="Trade Date" required defaultValue={trade.trade_date.slice(0, 10)} />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-body-sm font-medium text-text-secondary">Before Photo</label>
              {trade.before_photo_url && (
                <a
                  href={trade.before_photo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-caption text-primary hover:underline"
                >
                  Lihat foto saat ini
                </a>
              )}
              <input
                name="before_photo"
                type="file"
                accept="image/*"
                className="input-field file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-caption file:font-semibold file:text-text-on-primary"
              />
              <p className="text-caption text-text-muted">Kosongkan kalau nggak mau ganti foto.</p>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-body-sm font-medium text-text-secondary">After Photo</label>
              {trade.after_photo_url && (
                <a
                  href={trade.after_photo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-caption text-primary hover:underline"
                >
                  Lihat foto saat ini
                </a>
              )}
              <input
                name="after_photo"
                type="file"
                accept="image/*"
                className="input-field file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-caption file:font-semibold file:text-text-on-primary"
              />
              <p className="text-caption text-text-muted">Kosongkan kalau nggak mau ganti foto.</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-body-sm font-medium text-text-secondary">Notes</label>
            <textarea
              name="notes"
              rows={3}
              className="input-field resize-none"
              placeholder="Setup, reasoning, lessons..."
              defaultValue={trade.notes ?? ""}
            />
          </div>

          <Button type="submit" withArrow className="mt-2 w-full justify-center">
            Simpan Perubahan
          </Button>
        </form>
      </div>
    </div>
  );
}
