"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Trash2, Wallet } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createAccount, deleteAccount } from "@/app/(dashboard)/accounts/actions";
import { formatPlainCurrency, formatCurrency, pnlColorClass } from "@/lib/utils";
import type { TradingAccount } from "@/lib/types";

interface TradeSummary {
  account_id: string | null;
  pnl: number | null;
  status: string;
}

export function ManageAccountsModal({
  accounts,
  trades,
  onClose,
}: {
  accounts: TradingAccount[];
  trades: TradeSummary[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCurrency, setNewCurrency] = useState<"USD" | "IDR">("USD");

  async function handleAdd(formData: FormData) {
    const result = await createAccount(formData);
    if (result.success) {
      router.refresh();
      setShowAddForm(false);
    } else {
      alert(result.message);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Hapus akun "${name}"? Semua trade di akun ini akan ikut terhapus.`)) return;
    const result = await deleteAccount(id);
    if (result.success) {
      router.refresh();
    } else {
      alert(result.message);
    }
  }

  function accountStats(accountId: string) {
    const accTrades = trades.filter((t) => t.account_id === accountId && t.status === "CLOSED");
    const totalPnl = accTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
    return { totalPnl, tradeCount: accTrades.length };
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-h3 text-text-primary">Kelola Akun Journaling</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 flex flex-col gap-3">
          {accounts.map((acc) => {
            const { totalPnl, tradeCount } = accountStats(acc.id);
            const balance = acc.initial_balance + totalPnl;
            return (
              <div key={acc.id} className="card !p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-primary" />
                    <p className="text-body-sm font-semibold text-text-primary">{acc.name}</p>
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                      {acc.currency}
                    </span>
                  </div>
                  {accounts.length > 1 && (
                    <button onClick={() => handleDelete(acc.id, acc.name)} className="text-text-muted hover:text-error">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <p className="text-body font-semibold text-text-primary">{formatPlainCurrency(balance, acc.currency)}</p>
                <div className="mt-1 flex items-center justify-between text-caption text-text-secondary">
                  <span>Awal: {formatPlainCurrency(acc.initial_balance, acc.currency)}</span>
                  <span className={pnlColorClass(totalPnl)}>{formatCurrency(totalPnl, acc.currency)}</span>
                  <span className="text-text-muted">{tradeCount} trade</span>
                </div>
              </div>
            );
          })}
        </div>

        {showAddForm ? (
          <form action={handleAdd} className="flex flex-col gap-3 rounded-xl border border-border p-4">
            <Input name="name" label="Nama Akun" placeholder="Contoh: Akun Demo" required />

            <div className="flex flex-col gap-2">
              <label className="text-body-sm font-medium text-text-secondary">Mata Uang</label>
              <select
                name="currency"
                value={newCurrency}
                onChange={(e) => setNewCurrency(e.target.value as "USD" | "IDR")}
                className="input-field"
              >
                <option value="USD">USD ($)</option>
                <option value="IDR">IDR (Rp)</option>
              </select>
            </div>

            <Input
              name="initial_balance"
              type="number"
              step={newCurrency === "IDR" ? "1000" : "0.01"}
              label={`Balance Awal (${newCurrency === "IDR" ? "Rp" : "$"})`}
              defaultValue={newCurrency === "IDR" ? "150000000" : "10000"}
              required
            />
            <div className="flex gap-2">
              <Button type="submit" withArrow className="flex-1 justify-center">
                Buat Akun
              </Button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="btn-secondary !px-4"
              >
                Batal
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            disabled={accounts.length >= 5}
            className="btn-secondary w-full justify-center text-body-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Tambah Akun ({accounts.length}/5)
          </button>
        )}
      </div>
    </div>
  );
}
