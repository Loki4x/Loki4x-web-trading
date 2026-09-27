"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, RefreshCw } from "lucide-react";
import { TradeSideBadge } from "@/components/trades/TradeSideBadge";
import { AddSignalModal } from "@/components/admin/AddSignalModal";
import { cx, formatDate, formatPrice } from "@/lib/utils";
import { updateSignalStatus, updateSignalPrice, deleteSignal } from "@/app/admin/actions";
import { SIGNAL_STATUS_LABEL, signalStatusClass } from "@/lib/signal-metrics";
import type { Signal, SignalStatus } from "@/lib/types";

const STATUS_OPTIONS: SignalStatus[] = ["OPEN", "HIT_ENTRY", "TP", "SL", "PARTIAL", "CANCEL", "MISS"];
const TERMINAL: SignalStatus[] = ["TP", "SL", "PARTIAL", "CANCEL", "MISS"];

export function SignalsAdminTable({ signals }: { signals: Signal[] }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  async function handleStatusChange(signal: Signal, status: SignalStatus) {
    let currentPrice: number | null = signal.current_price;
    let resultPips: number | null = signal.result_pips;

    if (status === "CANCEL" || status === "MISS") {
      currentPrice = null;
      resultPips = null;
    } else if (status === "OPEN") {
      currentPrice = null;
      resultPips = null;
    } else {
      const priceInput = prompt(
        "Harga saat ini / harga penutupan?",
        (currentPrice ?? signal.entry_price).toString()
      );
      if (priceInput === null) return;
      currentPrice = Number(priceInput);

      if (status === "TP" || status === "SL" || status === "PARTIAL") {
        const pipsInput = prompt("Berapa pips hasilnya? (boleh minus untuk loss)", resultPips?.toString() ?? "0");
        if (pipsInput === null) return;
        resultPips = Number(pipsInput);
      } else {
        resultPips = null;
      }
    }

    await updateSignalStatus(signal.id, status, currentPrice, resultPips);
    router.refresh();
  }

  async function handleUpdatePrice(signal: Signal) {
    const priceInput = prompt("Update harga saat ini:", (signal.current_price ?? signal.entry_price).toString());
    if (priceInput === null) return;
    await updateSignalPrice(signal.id, Number(priceInput));
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus sinyal ini?")) return;
    await deleteSignal(id);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button onClick={() => setModalOpen(true)} className="btn-primary text-body-sm">
          <Plus className="h-4 w-4" />
          Post Signal
        </button>
      </div>

      <div className="card overflow-x-auto !p-0">
      <table className="w-full min-w-[880px] border-collapse">
        <thead>
          <tr className="border-b border-border bg-surface text-left">
            {["Symbol", "Side", "Entry", "Harga Saat Ini", "TP/SL", "Status", "Date", ""].map((h) => (
              <th key={h} className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-secondary">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {signals.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-10 text-center text-body-sm text-text-muted">
                Belum ada sinyal.
              </td>
            </tr>
          )}
          {signals.map((s) => (
            <tr key={s.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
              <td className="px-4 py-3 text-body-sm font-semibold text-text-primary">{s.symbol}</td>
              <td className="px-4 py-3">
                <TradeSideBadge side={s.side} />
              </td>
              <td className="tabular-nums px-4 py-3 text-body-sm text-text-secondary">
                {formatPrice(s.entry_price, s.symbol)}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="tabular-nums text-body-sm text-text-secondary">
                    {s.current_price !== null ? formatPrice(s.current_price, s.symbol) : "—"}
                  </span>
                  {!TERMINAL.includes(s.status) && (
                    <button
                      onClick={() => handleUpdatePrice(s)}
                      className="text-text-muted hover:text-primary"
                      title="Update harga saat ini"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </td>
              <td className="tabular-nums px-4 py-3 text-body-sm text-text-secondary">
                {s.take_profit !== null ? formatPrice(s.take_profit, s.symbol) : "—"} /{" "}
                {s.stop_loss !== null ? formatPrice(s.stop_loss, s.symbol) : "—"}
              </td>
              <td className="px-4 py-3">
                <select
                  value={s.status}
                  onChange={(e) => handleStatusChange(s, e.target.value as SignalStatus)}
                  className={cx(
                    "input-field !w-auto !py-1 text-caption font-bold",
                    signalStatusClass(s.status)
                  )}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {SIGNAL_STATUS_LABEL[opt]}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3 text-body-sm text-text-secondary">{formatDate(s.posted_at)}</td>
              <td className="px-4 py-3">
                <button onClick={() => handleDelete(s.id)} className="text-text-muted hover:text-error">
                  <Trash2 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      {modalOpen && <AddSignalModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}
