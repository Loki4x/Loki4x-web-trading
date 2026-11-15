"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Award, CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { submitQuiz } from "@/app/(dashboard)/academy/actions";
import { cx } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { QUIZ_PASS_PERCENT, type PublicQuizQuestion, type QuizResult } from "@/lib/academy";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export function QuizRunner({ slug, questions }: { slug: string; questions: PublicQuizQuestion[] }) {
  const t = useT();
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);

  const answered = questions.filter((q) => answers[q.id] !== undefined).length;

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    // Urutan kunci = urutan soal yang ditampilkan, supaya pembahasan tampil dengan urutan sama.
    const ordered: Record<string, number> = {};
    for (const q of questions) if (answers[q.id] !== undefined) ordered[q.id] = answers[q.id];
    const res = await submitQuiz(slug, ordered);
    setSubmitting(false);
    if (!res.success) {
      setError(res.message);
      return;
    }
    setResult(res.result);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (result) {
    return (
      <div className="flex flex-col gap-5">
        <div className={cx("card text-center", result.passed ? "border-success/40" : "border-warning/40")}>
          {result.passed ? (
            <Award className="mx-auto mb-2 h-10 w-10 text-success" />
          ) : (
            <RotateCcw className="mx-auto mb-2 h-10 w-10 text-warning" />
          )}
          <p className="text-h2 font-semibold tabular-nums text-text-primary">{result.percent}%</p>
          <p className="text-body-sm text-text-secondary">
            {t("{s} dari {n} jawaban benar", { s: result.score, n: result.total })}
          </p>
          <p className={cx("mt-2 text-body font-semibold", result.passed ? "text-success" : "text-warning")}>
            {result.passed
              ? t("Selamat, kamu lulus! 🎉")
              : t("Belum lulus. Butuh minimal {p}%, pelajari lagi pembahasan di bawah lalu coba lagi.", { p: QUIZ_PASS_PERCENT })}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link href={`/academy/${slug}`} className="btn-secondary px-4 py-2 text-body-sm">
              {t("Kembali ke video")}
            </Link>
            <button
              onClick={() => {
                setResult(null);
                setAnswers({});
                router.refresh();
              }}
              className="btn-primary px-4 py-2 text-body-sm"
            >
              <RotateCcw className="h-4 w-4" />
              {t("Ulangi kuis")}
            </button>
          </div>
        </div>

        <h2 className="text-h3 text-text-primary">{t("Pembahasan")}</h2>
        {result.items.map((item, i) => {
          const right = item.selected === item.correct;
          return (
            <div key={item.id} className="card">
              <div className="mb-3 flex items-start gap-2">
                {right ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                ) : (
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" />
                )}
                <p className="text-body font-semibold text-text-primary">
                  {i + 1}. {item.question}
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                {item.options.map((opt, idx) => (
                  <div
                    key={idx}
                    className={cx(
                      "rounded-lg border px-3 py-2 text-body-sm",
                      idx === item.correct
                        ? "border-success/50 bg-success-subtle text-text-primary"
                        : idx === item.selected
                          ? "border-error/50 bg-error-subtle text-text-primary"
                          : "border-border text-text-secondary"
                    )}
                  >
                    <span className="mr-2 font-semibold">{LETTERS[idx]}.</span>
                    {opt}
                    {idx === item.correct && <span className="ml-2 text-caption font-semibold text-success">{t("Jawaban benar")}</span>}
                    {idx === item.selected && idx !== item.correct && (
                      <span className="ml-2 text-caption font-semibold text-error">{t("Jawabanmu")}</span>
                    )}
                  </div>
                ))}
                {item.selected === null && <p className="text-caption text-error">{t("Tidak dijawab")}</p>}
              </div>
              {item.explanation && (
                <p className="mt-3 rounded-lg bg-surface-2/60 px-3 py-2 text-body-sm text-text-secondary">
                  <span className="font-semibold text-text-primary">{t("Pembahasan")}:</span> {item.explanation}
                </p>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {questions.map((q, i) => (
        <fieldset key={q.id} className="card">
          <legend className="sr-only">{q.question}</legend>
          <p className="mb-3 text-body font-semibold text-text-primary">
            {i + 1}. {q.question}
          </p>
          <div className="flex flex-col gap-2">
            {q.options.map((opt, idx) => {
              const selected = answers[q.id] === idx;
              return (
                <label
                  key={idx}
                  className={cx(
                    "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-body-sm transition-colors",
                    selected ? "border-primary bg-primary-subtle text-text-primary" : "border-border text-text-secondary hover:border-primary/50"
                  )}
                >
                  <input
                    type="radio"
                    name={q.id}
                    checked={selected}
                    onChange={() => setAnswers((a) => ({ ...a, [q.id]: idx }))}
                    className="sr-only"
                  />
                  <span
                    className={cx(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-caption font-semibold",
                      selected ? "border-primary bg-primary text-white" : "border-border"
                    )}
                  >
                    {LETTERS[idx]}
                  </span>
                  {opt}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}

      {error && <p className="rounded-lg bg-error-subtle px-3 py-2 text-body-sm text-error">{error}</p>}

      <div className="sticky bottom-4 flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface/95 p-3 shadow-lg backdrop-blur">
        <span className="pl-2 text-body-sm text-text-secondary">
          {t("{a} / {n} terjawab", { a: answered, n: questions.length })}
        </span>
        <Button onClick={handleSubmit} loading={submitting} disabled={answered < questions.length} withArrow>
          {t("Kumpulkan")}
        </Button>
      </div>
    </div>
  );
}
