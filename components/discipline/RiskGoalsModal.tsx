"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { updateAccountRules } from "@/app/(dashboard)/accounts/actions";
import { useT } from "@/lib/i18n/client";
import type { TradingAccount } from "@/lib/types";

const val = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(Number(v)));

export function RiskGoalsModal({ account, onClose }: { account: TradingAccount; onClose: () => void }) {
  const t = useT();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const currencyLabel = account.currency === "IDR" ? "Rp" : "$";

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    setError(null);
    const result = await updateAccountRules(account.id, formData);
    setSaving(false);
    if (result.success) {
      router.refresh();
      onClose();
    } else {
      setError(result.message);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-surface p-6">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-h3 text-text-primary">{t("Aturan & Target")}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-5 text-body-sm text-text-secondary">
          {t("Untuk akun {name}. Kosongkan kolom yang tidak ingin dipakai.", { name: account.name })}
        </p>

        <form action={handleSubmit} className="flex flex-col gap-4">
          <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">{t("Aturan risiko harian")}</p>
          <Input
            name="max_daily_loss_pct"
            type="number"
            step="0.1"
            min="0"
            label={t("Batas rugi harian (% saldo)")}
            placeholder={t("Contoh: 3")}
            defaultValue={val(account.max_daily_loss_pct)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              name="max_trades_per_day"
              type="number"
              step="1"
              min="0"
              label={t("Maks trade per hari")}
              placeholder={t("Contoh: 3")}
              defaultValue={val(account.max_trades_per_day)}
            />
            <Input
              name="max_consecutive_losses"
              type="number"
              step="1"
              min="0"
              label={t("Maks loss beruntun")}
              placeholder={t("Contoh: 2")}
              defaultValue={val(account.max_consecutive_losses)}
            />
          </div>

          <p className="mt-2 text-caption font-semibold uppercase tracking-wide text-text-muted">{t("Target bulanan")}</p>
          <div className="grid grid-cols-2 gap-4">
            <Input
              name="monthly_profit_target"
              type="number"
              step="0.01"
              min="0"
              label={t("Target profit ({cur})", { cur: currencyLabel })}
              placeholder={account.currency === "IDR" ? "5000000" : "500"}
              defaultValue={val(account.monthly_profit_target)}
            />
            <Input
              name="target_win_rate"
              type="number"
              step="1"
              min="0"
              max="100"
              label={t("Target win rate (%)")}
              placeholder="60"
              defaultValue={val(account.target_win_rate)}
            />
          </div>

          {error && <p className="rounded-lg bg-error-subtle px-3 py-2 text-body-sm text-error">{error}</p>}

          <Button type="submit" withArrow loading={saving} className="mt-2 w-full justify-center">
            {t("Simpan")}
          </Button>
        </form>
      </div>
    </div>
  );
}
