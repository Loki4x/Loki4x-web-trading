"use client";

import { X, ImageOff } from "lucide-react";
import type { Signal } from "@/lib/types";

export function SignalAnalysisModal({ signal, onClose }: { signal: Signal; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-h3 text-text-primary">
            Analisa — {signal.symbol} {signal.side}
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>

        {signal.chart_image_url ? (
          <a href={signal.chart_image_url} target="_blank" rel="noopener noreferrer">
            <img
              src={signal.chart_image_url}
              alt={`Chart analisa ${signal.symbol}`}
              className="mb-4 w-full rounded-lg border border-border object-contain"
            />
          </a>
        ) : (
          <div className="mb-4 flex h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-text-muted">
            <ImageOff className="h-6 w-6" />
            <p className="text-body-sm">Nggak ada chart yang di-upload untuk sinyal ini.</p>
          </div>
        )}

        {signal.notes ? (
          <p className="whitespace-pre-wrap text-body-sm text-text-secondary">{signal.notes}</p>
        ) : (
          <p className="text-body-sm text-text-muted">Nggak ada catatan alasan untuk sinyal ini.</p>
        )}
      </div>
    </div>
  );
}
