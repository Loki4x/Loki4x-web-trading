"use client";

import Link from "next/link";
import { Award, ClipboardCheck, PlayCircle } from "lucide-react";
import { cx } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { QUIZ_PASS_PERCENT } from "@/lib/academy";

export function AcademyProgressCard({
  slug,
  watched,
  totalVideos,
  questionCount,
  attempts,
  best,
}: {
  slug: string;
  watched: number;
  totalVideos: number;
  questionCount: number;
  attempts: number;
  best: { score: number; total: number; passed: boolean } | null;
}) {
  const t = useT();
  const videoPct = totalVideos > 0 ? Math.round((watched / totalVideos) * 100) : 0;
  const bestPct = best && best.total > 0 ? Math.round((best.score / best.total) * 100) : null;
  const passed = !!best?.passed;
  const allWatched = totalVideos > 0 && watched >= totalVideos;
  const completed = allWatched && (questionCount === 0 || passed);

  return (
    <div className={cx("card", completed && "border-success/40")}>
      {completed && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-success-subtle px-3 py-2.5 text-body-sm font-semibold text-success">
          <Award className="h-5 w-5" />
          {questionCount > 0
            ? t("Kategori selesai! Semua video sudah ditonton dan kuis lulus.")
            : t("Kategori selesai! Semua video sudah ditonton.")}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wide text-text-muted">
            <PlayCircle className="h-3.5 w-3.5" />
            {t("Progres video")}
          </p>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-h3 font-semibold tabular-nums text-text-primary">
              {watched} <span className="text-body text-text-muted">/ {totalVideos}</span>
            </span>
            <span className="text-body-sm font-semibold text-text-secondary">{videoPct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className={cx("h-full rounded-full transition-all", allWatched ? "bg-success" : "bg-primary")}
              style={{ width: `${videoPct}%` }}
            />
          </div>
          <p className="mt-2 text-caption text-text-muted">{t("Tandai video sebagai sudah ditonton dari pemutar video.")}</p>
        </div>

        <div>
          <p className="mb-2 flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wide text-text-muted">
            <ClipboardCheck className="h-3.5 w-3.5" />
            {t("Kuis")}
          </p>
          {questionCount === 0 ? (
            <p className="text-body-sm text-text-muted">{t("Kuis untuk kategori ini belum tersedia.")}</p>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                {bestPct === null ? (
                  <p className="text-body-sm text-text-secondary">
                    {t("{n} soal · lulus minimal {p}%", { n: questionCount, p: QUIZ_PASS_PERCENT })}
                  </p>
                ) : (
                  <>
                    <p className={cx("text-body font-semibold", passed ? "text-success" : "text-warning")}>
                      {passed ? t("Lulus ✓") : t("Belum lulus")} · {t("skor terbaik {p}%", { p: bestPct })}
                    </p>
                    <p className="text-caption text-text-muted">
                      {t("{n}x percobaan · lulus minimal {p}%", { n: attempts, p: QUIZ_PASS_PERCENT })}
                    </p>
                  </>
                )}
              </div>
              <Link href={`/academy/${slug}/quiz`} className={cx(passed ? "btn-secondary" : "btn-primary", "px-4 py-2 text-body-sm")}>
                {bestPct === null ? t("Mulai kuis") : t("Ulangi kuis")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
