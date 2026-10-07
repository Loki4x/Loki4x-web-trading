import { pipSizeFor } from "@/lib/signal-metrics";
import type { SignalStatus } from "@/lib/types";

export type Side = "BUY" | "SELL";

/** Pembulatan 1 desimal, sama dengan input pips di form. */
export const round1 = (n: number) => Math.round(n * 10) / 10;

/** Pips dari pergerakan harga entry -> price (positif = untung, sesuai arah BUY/SELL). */
export function pipsBetween(symbol: string, side: Side, entry: number, price: number): number {
  const move = side === "BUY" ? price - entry : entry - price;
  return move / pipSizeFor(symbol.trim().toUpperCase());
}

export interface PipsIssue {
  level: "warn" | "severe";
  message: string;
}

export interface PipsCheck {
  /** Hasil pips yang dihitung dari harga; null kalau data belum cukup. */
  suggested: number | null;
  issues: PipsIssue[];
}

/**
 * Cek hasil pips yang diisi admin terhadap hitungan dari harga.
 * - warn: selisih lebih dari max(3 pips, 1%)  -> kemungkinan salah ketik kecil.
 * - severe: selisih lebih dari max(20 pips, 10%) -> hampir pasti salah, form minta konfirmasi.
 */
export function checkResultPips(input: {
  status: SignalStatus;
  symbol: string;
  side: Side;
  entry: number | null;
  closePrice: number | null;
  pips: number | null;
}): PipsCheck {
  const { status, symbol, side, entry, closePrice, pips } = input;
  const issues: PipsIssue[] = [];

  const canCompute = symbol.trim() !== "" && entry !== null && closePrice !== null;
  const suggested = canCompute ? round1(pipsBetween(symbol, side, entry as number, closePrice as number)) : null;

  if (pips === null) {
    issues.push({
      level: "warn",
      message:
        suggested !== null
          ? "Hasil pips kosong. Kalau dibiarkan, tersimpan 0 (isi dengan hitungan di bawah)."
          : "Hasil pips kosong, akan tersimpan 0.",
    });
  }

  if (suggested !== null && pips !== null) {
    const diff = Math.abs(pips - suggested);
    const warnTol = Math.max(3, Math.abs(suggested) * 0.01);
    const severeTol = Math.max(20, Math.abs(suggested) * 0.1);
    if (diff > warnTol) {
      issues.push({
        level: diff > severeTol ? "severe" : "warn",
        message: `Hasil ${pips} pips berbeda ${round1(diff)} pips dari hitungan harga (${suggested} pips). Cek harga penutupan atau angka pips.`,
      });
    }
  }

  if (suggested !== null) {
    if (status === "TP" && suggested < 0) {
      issues.push({ level: "warn", message: "Status TP, tapi harga penutupan ada di sisi rugi dari entry." });
    }
    if (status === "SL" && suggested > 0) {
      issues.push({
        level: "warn",
        message: "Status SL, tapi harga penutupan ada di sisi untung dari entry (abaikan kalau trailing stop).",
      });
    }
  } else if (pips !== null) {
    if (status === "TP" && pips < 0) issues.push({ level: "warn", message: "Status TP biasanya hasilnya positif." });
    if (status === "SL" && pips > 0) {
      issues.push({ level: "warn", message: "Status SL biasanya hasilnya negatif (pakai tanda minus)." });
    }
  }

  return { suggested, issues };
}

/** Peringatan posisi TP/SL terhadap entry sesuai arah (BUY: TP di atas, SL di bawah; SELL sebaliknya). */
export function levelIssues(side: Side, entry: number | null, takeProfit: number | null, stopLoss: number | null): string[] {
  if (entry === null) return [];
  const out: string[] = [];
  if (takeProfit !== null && (side === "BUY" ? takeProfit <= entry : takeProfit >= entry)) {
    out.push(`Take Profit seharusnya di ${side === "BUY" ? "atas" : "bawah"} entry untuk ${side}.`);
  }
  if (stopLoss !== null && (side === "BUY" ? stopLoss >= entry : stopLoss <= entry)) {
    out.push(`Stop Loss seharusnya di ${side === "BUY" ? "bawah" : "atas"} entry untuk ${side}.`);
  }
  return out;
}
