"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, ImageIcon } from "lucide-react";
import { TradeSideBadge } from "@/components/trades/TradeSideBadge";
import { AddSignalModal } from "@/components/admin/AddSignalModal";
import { UpdateSignalStatusModal } from "@/components/admin/UpdateSignalStatusModal";
import { SignalAnalysisModal } from "@/components/signals/SignalAnalysisModal";
import { cx, formatDate, formatPrice } from "@/lib/utils";
import { deleteSignal } from "@/app/admin/actions";
import { SIGNAL_STATUS_LABEL, signalStatusClass } from "@/lib/signal-metrics";
import type { Signal } from "@/lib/types";

export function SignalsAdminTable({ signals }: { signals: Signal[] }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSignal, setEditingSignal] = useState<Signal | null>(null);
  const [analysisSignal, setAnalysisSignal] = useState<Signal | null>(null);

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
      <table className="w-full min-w-[840px] border-collapse">
        <thead>
          <tr className="border-b border-border bg-surface text-left">
            {["Symbol", "Side", "Entry", "TP/SL", "Status", "Date", "Analisa", ""].map((h) => (
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
              <td className="tabular-nums px-4 py-3 text-body-sm text-text-secondary">
                {s.take_profit !== null ? formatPrice(s.take_profit, s.symbol) : "—"} /{" "}
                {s.stop_loss !== null ? formatPrice(s.stop_loss, s.symbol) : "—"}
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => setEditingSignal(s)}
                  className={cx(
                    "inline-flex rounded-md px-2 py-0.5 text-caption font-bold leading-none transition-opacity hover:opacity-80",
                    signalStatusClass(s.status)
                  )}
                >
                  {SIGNAL_STATUS_LABEL[s.status]}
                </button>
              </td>
              <td className="px-4 py-3 text-body-sm text-text-secondary">{formatDate(s.posted_at)}</td>
              <td className="px-4 py-3">
                {s.chart_image_url || s.notes ? (
                  <button
                    onClick={() => setAnalysisSignal(s)}
                    className="flex items-center gap-1.5 text-body-sm font-medium text-primary hover:underline"
                  >
                    <ImageIcon className="h-4 w-4" />
                    Lihat
                  </button>
                ) : (
                  <span className="text-body-sm text-text-muted">—</span>
                )}
              </td>
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
      {editingSignal && (
        <UpdateSignalStatusModal signal={editingSignal} onClose={() => setEditingSignal(null)} />
      )}
      {analysisSignal && (
        <SignalAnalysisModal signal={analysisSignal} onClose={() => setAnalysisSignal(null)} />
      )}
    </div>
  );
}
