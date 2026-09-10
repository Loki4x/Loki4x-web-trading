"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Wallet } from "lucide-react";
import { AddAccountModal } from "@/components/accounts/AddAccountModal";
import { deleteAccount } from "@/app/(dashboard)/accounts/actions";
import { formatPlainCurrency, formatCurrency, pnlColorClass } from "@/lib/utils";
import type { TradingAccount } from "@/lib/types";

interface TradeSummary {
  account_id: string | null;
  pnl: number | null;
  status: string;
}

export function AccountsClient({
  accounts,
  trades,
}: {
  accounts: TradingAccount[];
  trades: TradeSummary[];
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

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
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setModalOpen(true)}
          disabled={accounts.length >= 5}
          className="btn-primary text-body-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Tambah Akun ({accounts.length}/5)
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((acc) => {
          const { totalPnl, tradeCount } = accountStats(acc.id);
          const balance = acc.initial_balance + totalPnl;
          return (
            <div key={acc.id} className="card">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  <p className="text-body-sm font-semibold text-text-primary">{acc.name}</p>
                </div>
                {accounts.length > 1 && (
                  <button onClick={() => handleDelete(acc.id, acc.name)} className="text-text-muted hover:text-error">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="text-h3 text-text-primary">{formatPlainCurrency(balance)}</p>
              <div className="mt-3 flex items-center justify-between text-caption text-text-secondary">
                <span>Balance awal: {formatPlainCurrency(acc.initial_balance)}</span>
                <span className={pnlColorClass(totalPnl)}>{formatCurrency(totalPnl)}</span>
              </div>
              <p className="mt-1 text-caption text-text-muted">{tradeCount} trade ditutup</p>
            </div>
          );
        })}
      </div>

      {modalOpen && <AddAccountModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}
