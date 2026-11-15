"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileUp, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { importTrades } from "@/app/(dashboard)/trades/actions";
import { decodeFileBytes, parseImportFile, type ParseResult } from "@/lib/trade-import";
import { cx, formatCurrency } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import type { AccountCurrency } from "@/lib/types";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const BATCH = 500;

export function ImportTradesModal({
  onClose,
  accountId,
  accountName,
  accountCurrency = "USD",
}: {
  onClose: () => void;
  accountId: string;
  accountName: string;
  accountCurrency?: AccountCurrency;
}) {
  const t = useT();
  const router = useRouter();
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [done, setDone] = useState<{ inserted: number; duplicates: number; invalid: number } | null>(null);

  async function handleFile(file: File | undefined) {
    setError(null);
    setParsed(null);
    setDone(null);
    if (!file) return;
    setFileName(file.name);
    if (file.size > MAX_FILE_BYTES) {
      setError(t("File terlalu besar (maks 10 MB)."));
      return;
    }
    const text = decodeFileBytes(new Uint8Array(await file.arrayBuffer()));
    const result = parseImportFile(text);
    if (result.rows.length === 0) {
      setError(
        t("Tidak ada trade yang bisa dibaca dari file ini. Pastikan file adalah statement MT4/MT5 (HTML) atau CSV dengan kolom symbol, side/type, dan entry/open price.")
      );
      return;
    }
    setParsed(result);
  }

  async function handleImport() {
    if (!parsed) return;
    setError(null);
    const total = { inserted: 0, duplicates: 0, invalid: 0 };
    for (let i = 0; i < parsed.rows.length; i += BATCH) {
      setProgress(Math.round((i / parsed.rows.length) * 100));
      const res = await importTrades(accountId, parsed.rows.slice(i, i + BATCH));
      if (!res.success) {
        setError(res.message);
        setProgress(null);
        if (total.inserted > 0) router.refresh();
        return;
      }
      total.inserted += res.inserted;
      total.duplicates += res.duplicates;
      total.invalid += res.invalid;
    }
    setProgress(null);
    setDone(total);
    router.refresh();
  }

  const closed = parsed?.rows.filter((r) => r.pnl !== null) ?? [];
  const totalPnl = closed.reduce((sum, r) => sum + (r.pnl ?? 0), 0);
  const dates = parsed?.rows.map((r) => r.trade_date).sort() ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-surface p-6">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-h3 text-text-primary">{t("Import Trade")}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-5 text-body-sm text-text-secondary">
          {t("Trade akan masuk ke akun {name}.", { name: accountName })}
        </p>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-success" />
            <p className="text-body font-semibold text-text-primary">
              {t("{n} trade berhasil di-import", { n: done.inserted })}
            </p>
            {(done.duplicates > 0 || done.invalid > 0) && (
              <p className="text-body-sm text-text-secondary">
                {done.duplicates > 0 && t("{n} sudah pernah di-import (dilewati).", { n: done.duplicates })}{" "}
                {done.invalid > 0 && t("{n} baris tidak valid (dilewati).", { n: done.invalid })}
              </p>
            )}
            <Button onClick={onClose} className="mt-2">
              {t("Selesai")}
            </Button>
          </div>
        ) : (
          <>
            <details className="mb-4 rounded-lg border border-border bg-surface-2/50 p-3 text-body-sm text-text-secondary">
              <summary className="cursor-pointer font-medium text-text-primary">{t("Cara ambil file dari MT4 / MT5")}</summary>
              <div className="mt-3 flex flex-col gap-2">
                <p>
                  <span className="font-semibold text-text-primary">MT4:</span>{" "}
                  {t("Terminal → tab Account History → klik kanan → All History → klik kanan lagi → Save as Detailed Report.")}
                </p>
                <p>
                  <span className="font-semibold text-text-primary">MT5:</span>{" "}
                  {t("Toolbox → tab History → klik kanan → pilih Positions → klik kanan → Report → HTML.")}
                </p>
                <p>
                  <span className="font-semibold text-text-primary">CSV:</span>{" "}
                  {t("Minimal ada kolom symbol, side/type, entry/open price. File hasil Export CSV dari jurnal ini juga bisa di-import.")}
                </p>
                <p className="text-caption text-text-muted">
                  {t("Hanya posisi yang sudah ditutup yang di-import dari MT4/MT5. Trade yang sama tidak akan masuk dua kali.")}
                </p>
              </div>
            </details>

            <label
              className={cx(
                "mb-4 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-6 text-center transition-colors hover:border-primary",
                progress !== null && "pointer-events-none opacity-50"
              )}
            >
              <FileUp className="h-7 w-7 text-primary" />
              <span className="text-body-sm font-medium text-text-primary">
                {fileName ?? t("Pilih file statement (.htm / .html / .csv)")}
              </span>
              <span className="text-caption text-text-muted">{t("Maks 10 MB")}</span>
              <input
                type="file"
                accept=".htm,.html,.csv,.txt"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </label>

            {error && <p className="mb-4 rounded-lg bg-error-subtle px-3 py-2 text-body-sm text-error">{error}</p>}

            {parsed && (
              <>
                <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { label: t("Format"), value: parsed.format ?? "-" },
                    { label: t("Jumlah trade"), value: String(parsed.rows.length) },
                    { label: t("Periode"), value: dates.length ? `${dates[0]} → ${dates[dates.length - 1]}` : "-" },
                    { label: "Total P&L", value: formatCurrency(totalPnl, accountCurrency) },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg bg-surface-2/60 px-3 py-2">
                      <p className="text-caption text-text-muted">{s.label}</p>
                      <p className="break-words text-body-sm font-semibold text-text-primary">{s.value}</p>
                    </div>
                  ))}
                </div>
                {parsed.skipped > 0 && (
                  <p className="mb-3 text-caption text-warning">
                    {t("{n} baris tidak bisa dibaca dan dilewati.", { n: parsed.skipped })}
                  </p>
                )}

                <div className="mb-4 overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-left text-caption">
                    <thead className="bg-surface-2 text-text-muted">
                      <tr>
                        <th className="px-3 py-2">{t("Tanggal")}</th>
                        <th className="px-3 py-2">Symbol</th>
                        <th className="px-3 py-2">Side</th>
                        <th className="px-3 py-2 text-right">Entry</th>
                        <th className="px-3 py-2 text-right">Exit</th>
                        <th className="px-3 py-2 text-right">P&L</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {parsed.rows.slice(0, 8).map((r, i) => (
                        <tr key={i} className="text-text-secondary">
                          <td className="px-3 py-1.5">{r.trade_date}</td>
                          <td className="px-3 py-1.5 font-medium text-text-primary">{r.symbol}</td>
                          <td className={cx("px-3 py-1.5", r.side === "BUY" ? "text-success" : "text-error")}>{r.side}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{r.entry_price}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{r.exit_price ?? "-"}</td>
                          <td
                            className={cx(
                              "px-3 py-1.5 text-right tabular-nums",
                              (r.pnl ?? 0) >= 0 ? "text-success" : "text-error"
                            )}
                          >
                            {r.pnl === null ? "-" : formatCurrency(r.pnl, accountCurrency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsed.rows.length > 8 && (
                    <p className="border-t border-border px-3 py-2 text-caption text-text-muted">
                      {t("+{n} trade lainnya", { n: parsed.rows.length - 8 })}
                    </p>
                  )}
                </div>

                <Button onClick={handleImport} loading={progress !== null} withArrow className="w-full justify-center">
                  {progress !== null
                    ? t("Mengimport... {p}%", { p: progress })
                    : t("Import {n} trade", { n: parsed.rows.length })}
                </Button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
