import { getCotSnapshot } from "@/lib/cot";

export interface CotHighlight {
  label: string;
  netChangePct: number;
}

/**
 * Versi ringkas buat kartu di Dashboard: cuma top 3 positif & top 3 negatif.
 * Untuk data lengkap semua aset, pakai getCotSnapshot() dari lib/cot.ts
 * (dipakai di halaman /cot).
 */
export async function getCotHighlights(): Promise<{
  positive: CotHighlight[];
  negative: CotHighlight[];
  reportDate: string | null;
}> {
  const { rows, reportDate } = await getCotSnapshot();

  const sorted = [...rows].sort((a, b) => b.netChangePct - a.netChangePct);
  const positive = sorted
    .filter((r) => r.netChangePct > 0)
    .slice(0, 3)
    .map((r) => ({ label: r.label, netChangePct: r.netChangePct }));
  const negative = sorted
    .filter((r) => r.netChangePct < 0)
    .slice(-3)
    .reverse()
    .map((r) => ({ label: r.label, netChangePct: r.netChangePct }));

  return { positive, negative, reportDate };
}
