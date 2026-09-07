"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus } from "lucide-react";
import { TradeSideBadge } from "@/components/trades/TradeSideBadge";
import { AddSignalModal } from "@/components/admin/AddSignalModal";
import { cx, formatDate } from "@/lib/utils";
import { updateSignalStatus, deleteSignal } from "@/app/admin/actions";
import type { Signal } from "@/lib/types";

export function SignalsAdminTable({ signals }: { signals: Signal[] }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  async function handleMarkResult(signal: Signal, status: Signal["status"]) {
    let resultPips: number | null = signal.result_pips;
    if (status === "TP_HIT" || status === "SL_HIT" || status === "CLOSED") {
      const input = prompt("Berapa pips hasilnya? (boleh minus untuk loss)", resultPips?.toString() ?? "0");
      if (input === null) return;
      resultPips = Number(input);
    } else {
      resultPips = null;
    }
    await updateSignalStatus(signal.id, status, resultPips);
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
      <table className="w-full min-w-[720px] border-collapse">
        <thead>
          <tr className="border-b border-border bg-surface text-left">
            {["Symbol", "Side", "Entry", "TP/SL", "Status", "Date", ""].map((h) => (
              <th key={h} className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-secondary">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {signals.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-body-sm text-text-muted">
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
              <td className="px-4 py-3 text-body-sm text-text-secondary">{s.entry_price}</td>
              <td className="px-4 py-3 text-body-sm text-text-secondary">
                {s.take_profit ?? "—"} / {s.stop_loss ?? "—"}
              </td>
              <td className="px-4 py-3">
                <select
                  value={s.status}
                  onChange={(e) => handleMarkResult(s, e.target.value as Signal["status"])}
                  className={cx(
                    "input-field !w-auto !py-1 text-caption font-bold",
                    s.status === "TP_HIT" && "text-success",
                    s.status === "SL_HIT" && "text-error"
                  )}
                >
                  <option value="OPEN">OPEN</option>
                  <option value="TP_HIT">TP HIT</option>
                  <option value="SL_HIT">SL HIT</option>
                  <option value="CLOSED">CLOSED</option>
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
