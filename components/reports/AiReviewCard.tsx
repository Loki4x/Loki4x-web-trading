"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ListChecks, Loader2, Sparkles, ThumbsUp } from "lucide-react";
import { reviewJournal } from "@/app/(dashboard)/reports/actions";
import { useLocale, useT } from "@/lib/i18n/client";
import { dateLocale } from "@/lib/i18n/dictionary";
import type { JournalReview, ReviewItem } from "@/lib/ai-review";

interface Stored {
  review: JournalReview;
  createdAt: string;
  tradeCount: number;
}

const storageKey = (accountId: string) => `loki4x:ai-review:${accountId}`;

function Section({ title, icon: Icon, items, tone }: { title: string; icon: typeof ThumbsUp; items: ReviewItem[]; tone: string }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className={`mb-2 flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wide ${tone}`}>
        <Icon className="h-3.5 w-3.5" />
        {title}
      </p>
      <ul className="flex flex-col gap-2.5">
        {items.map((item, i) => (
          <li key={i} className="rounded-lg bg-surface-2/60 px-3 py-2.5">
            <p className="text-body-sm font-semibold text-text-primary">{item.title}</p>
            <p className="mt-0.5 text-body-sm text-text-secondary">{item.detail}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AiReviewCard({ accountId, closedTrades }: { accountId: string; closedTrades: number }) {
  const t = useT();
  const locale = useLocale();
  const [data, setData] = useState<Stored | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Review terakhir disimpan di browser per akun, supaya tidak hilang saat halaman dibuka lagi.
  useEffect(() => {
    setData(null);
    try {
      const raw = localStorage.getItem(storageKey(accountId));
      if (raw) setData(JSON.parse(raw) as Stored);
    } catch {
      // abaikan data rusak
    }
  }, [accountId]);

  async function run() {
    setLoading(true);
    setError(null);
    const res = await reviewJournal(accountId);
    setLoading(false);
    if (!res.success) {
      setError(res.message);
      return;
    }
    const stored: Stored = { review: res.review, createdAt: res.createdAt, tradeCount: res.tradeCount };
    setData(stored);
    try {
      localStorage.setItem(storageKey(accountId), JSON.stringify(stored));
    } catch {
      // storage penuh / diblokir: tetap tampil di layar
    }
  }

  const tooFew = closedTrades < 10;

  return (
    <div className="card">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-body font-semibold text-text-primary">
            <Sparkles className="h-4 w-4 text-primary" />
            {t("Review Jurnal AI")}
          </h3>
          <p className="text-caption text-text-muted">
            {data
              ? t("Dibuat {date} dari {n} trade", {
                  date: new Date(data.createdAt).toLocaleString(dateLocale(locale), {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                  n: data.tradeCount,
                })
              : t("AI membaca pola di jurnalmu: sesi, strategi, emosi, dan disiplin.")}
          </p>
        </div>
        <button onClick={run} disabled={loading || tooFew} className="btn-primary px-4 py-2 text-body-sm disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? t("Menganalisa...") : data ? t("Review ulang") : t("Review jurnalku")}
        </button>
      </div>

      {loading && (
        <p className="mb-4 text-body-sm text-text-secondary">{t("AI sedang membaca jurnal kamu. Biasanya 15–40 detik.")}</p>
      )}
      {error && <p className="mb-4 rounded-lg bg-error-subtle px-3 py-2 text-body-sm text-error">{error}</p>}
      {tooFew && !data && (
        <p className="text-body-sm text-text-muted">
          {t("Butuh minimal 10 trade yang sudah ditutup. Sekarang baru {n}.", { n: closedTrades })}
        </p>
      )}

      {data && (
        <div className="flex flex-col gap-5">
          <p className="text-body text-text-primary">{data.review.summary}</p>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Section title={t("Yang sudah bagus")} icon={ThumbsUp} items={data.review.strengths} tone="text-success" />
            <Section title={t("Yang perlu diperbaiki")} icon={AlertTriangle} items={data.review.weaknesses} tone="text-warning" />
            <Section title={t("Rencana aksi")} icon={ListChecks} items={data.review.actions} tone="text-primary" />
          </div>
          <p className="text-caption text-text-muted">
            {t("Review dibuat oleh AI dari data jurnalmu dan bisa keliru. Ini bukan saran keuangan. Maks 3 review per hari.")}
          </p>
        </div>
      )}
    </div>
  );
}
