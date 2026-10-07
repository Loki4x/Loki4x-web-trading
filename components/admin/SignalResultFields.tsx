"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { checkResultPips, round1, type Side } from "@/lib/signal-pips";
import type { SignalStatus } from "@/lib/types";

interface Props {
  symbol: string;
  side: Side;
  entry: number | null;
  takeProfit: number | null;
  stopLoss: number | null;
  status: SignalStatus;
  defaultClosing?: string;
  defaultPips?: string;
  closingLabel: string;
  closingPlaceholder?: string;
  closingRequired?: boolean;
  /** Dipanggil saat hasil pips berbeda jauh dari hitungan harga dan belum dikonfirmasi. */
  onBlockedChange?: (blocked: boolean) => void;
}

const toNum = (s: string): number | null => {
  if (s.trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

/**
 * Kolom Harga Penutupan + Hasil (pips) dengan hitung otomatis dan validasi.
 * - Hasil pips terisi otomatis dari harga (selama admin belum mengetik sendiri).
 * - Kalau angka yang diisi menyimpang dari hitungan harga, muncul peringatan; kalau
 *   menyimpang jauh, form harus dikonfirmasi dulu sebelum bisa disimpan.
 */
export function SignalResultFields({
  symbol,
  side,
  entry,
  takeProfit,
  stopLoss,
  status,
  defaultClosing = "",
  defaultPips = "",
  closingLabel,
  closingPlaceholder,
  closingRequired = false,
  onBlockedChange,
}: Props) {
  const [closing, setClosing] = useState(defaultClosing);
  const [pips, setPips] = useState(defaultPips);
  // Nilai yang sudah ada sebelumnya dianggap "sudah diisi" supaya tidak ditimpa diam-diam.
  const [pipsTouched, setPipsTouched] = useState(defaultPips !== "");
  const [ack, setAck] = useState(false);

  const closingNum = toNum(closing);
  const fallbackClose = status === "TP" ? takeProfit : status === "SL" ? stopLoss : null;
  const effectiveClose = closingNum ?? fallbackClose;
  const pipsNum = toNum(pips);

  const { suggested, issues } = useMemo(
    () => checkResultPips({ status, symbol, side, entry, closePrice: effectiveClose, pips: pipsNum }),
    [status, symbol, side, entry, effectiveClose, pipsNum]
  );

  useEffect(() => {
    if (!pipsTouched && suggested !== null) setPips(String(suggested));
  }, [pipsTouched, suggested]);

  // Konfirmasi hanya berlaku untuk angka yang sedang tampil.
  useEffect(() => {
    setAck(false);
  }, [pips, suggested]);

  const severe = issues.some((i) => i.level === "severe");
  const blocked = severe && !ack;
  useEffect(() => {
    onBlockedChange?.(blocked);
    return () => onBlockedChange?.(false);
  }, [blocked, onBlockedChange]);

  const differs = suggested !== null && (pipsNum === null || round1(pipsNum) !== suggested);

  return (
    <>
      <Input
        name="closing_price"
        type="number"
        step="0.00001"
        label={closingLabel}
        placeholder={closingPlaceholder}
        required={closingRequired}
        value={closing}
        onChange={(e) => setClosing(e.target.value)}
      />

      <div>
        <Input
          name="result_pips"
          type="number"
          step="0.1"
          label="Hasil (pips, boleh minus untuk loss)"
          placeholder="e.g. 25 atau -10"
          value={pips}
          onChange={(e) => {
            setPips(e.target.value);
            setPipsTouched(true);
          }}
        />

        {suggested !== null && (
          <p className="mt-1.5 text-caption text-text-muted">
            Hitungan dari harga:{" "}
            <span className="font-semibold text-text-secondary">
              {suggested > 0 ? "+" : ""}
              {suggested} pips
            </span>
            {differs && (
              <button
                type="button"
                onClick={() => {
                  setPips(String(suggested));
                  setPipsTouched(false);
                }}
                className="ml-2 font-semibold text-primary underline"
              >
                Pakai angka ini
              </button>
            )}
          </p>
        )}

        {issues.map((issue, i) => (
          <p
            key={i}
            className={`mt-1.5 text-caption ${issue.level === "severe" ? "text-error" : "text-warning"}`}
          >
            {issue.message}
          </p>
        ))}

        {severe && (
          <label className="mt-2 flex items-start gap-2 text-caption text-text-secondary">
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
              className="mt-0.5"
            />
            Saya sudah cek, tetap simpan dengan angka ini
          </label>
        )}
      </div>
    </>
  );
}
