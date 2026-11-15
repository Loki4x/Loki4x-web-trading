"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { addQuizQuestion, deleteQuizQuestion } from "@/app/admin/actions";
import { CATEGORY_LABEL, type AcademyCategory, type QuizQuestion } from "@/lib/academy";
import { cx } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";

const CATEGORIES: AcademyCategory[] = ["TECHNICAL", "FUNDAMENTAL", "PSYCHOLOGY"];
const LETTERS = ["A", "B", "C", "D", "E", "F"];

function AddQuestionModal({ defaultCategory, onClose }: { defaultCategory: AcademyCategory; onClose: () => void }) {
  const t = useT();
  const router = useRouter();
  const [optionCount, setOptionCount] = useState(4);
  const [correct, setCorrect] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    setError(null);
    formData.set("correct_index", String(correct));
    const res = await addQuizQuestion(formData);
    setSaving(false);
    if (!res.success) {
      setError(res.message);
      return;
    }
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-h3 text-text-primary">{t("Tambah Soal Kuis")}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-body-sm font-medium text-text-secondary">{t("Kategori")}</label>
            <select name="category" defaultValue={defaultCategory} className="input-field">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-body-sm font-medium text-text-secondary">{t("Pertanyaan")}</label>
            <textarea name="question" required minLength={5} maxLength={500} rows={3} className="input-field resize-none" />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-body-sm font-medium text-text-secondary">
              {t("Pilihan jawaban (klik huruf untuk menandai jawaban benar)")}
            </label>
            {Array.from({ length: optionCount }, (_, i) => (
              <div key={i} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCorrect(i)}
                  className={cx(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-body-sm font-semibold",
                    correct === i ? "border-success bg-success text-white" : "border-border text-text-secondary hover:border-success"
                  )}
                  title={t("Tandai sebagai jawaban benar")}
                >
                  {LETTERS[i]}
                </button>
                <input name="options" maxLength={200} required={i < 2} className="input-field" />
              </div>
            ))}
            <div className="flex gap-3 text-caption">
              {optionCount < 6 && (
                <button type="button" onClick={() => setOptionCount((n) => n + 1)} className="font-medium text-primary hover:underline">
                  + {t("Tambah pilihan")}
                </button>
              )}
              {optionCount > 2 && (
                <button
                  type="button"
                  onClick={() => {
                    setOptionCount((n) => n - 1);
                    if (correct >= optionCount - 1) setCorrect(0);
                  }}
                  className="font-medium text-text-muted hover:underline"
                >
                  − {t("Kurangi pilihan")}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-body-sm font-medium text-text-secondary">{t("Pembahasan (opsional)")}</label>
            <textarea name="explanation" maxLength={1000} rows={2} className="input-field resize-none" />
          </div>

          {error && <p className="rounded-lg bg-error-subtle px-3 py-2 text-body-sm text-error">{error}</p>}

          <Button type="submit" withArrow loading={saving} className="mt-2 w-full justify-center">
            {t("Simpan Soal")}
          </Button>
        </form>
      </div>
    </div>
  );
}

export function QuizAdmin({ questions }: { questions: QuizQuestion[] }) {
  const t = useT();
  const router = useRouter();
  const [category, setCategory] = useState<AcademyCategory>("TECHNICAL");
  const [modalOpen, setModalOpen] = useState(false);
  const list = questions.filter((q) => q.category === category);

  async function handleDelete(id: string) {
    if (!confirm(t("Hapus soal ini?"))) return;
    await deleteQuizQuestion(id);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cx(
                "rounded-full px-4 py-1.5 text-body-sm font-medium",
                c === category ? "bg-primary text-white" : "bg-surface-2 text-text-secondary hover:text-text-primary"
              )}
            >
              {CATEGORY_LABEL[c]} ({questions.filter((q) => q.category === c).length})
            </button>
          ))}
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary text-body-sm">
          <Plus className="h-4 w-4" />
          {t("Tambah Soal")}
        </button>
      </div>

      {list.length === 0 ? (
        <div className="card py-10 text-center text-body-sm text-text-muted">
          {t("Belum ada soal di kategori ini. Kuis baru muncul untuk member setelah ada soal.")}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((q, i) => (
            <div key={q.id} className="card">
              <div className="mb-2 flex items-start justify-between gap-3">
                <p className="text-body-sm font-semibold text-text-primary">
                  {i + 1}. {q.question}
                </p>
                <button onClick={() => handleDelete(q.id)} className="text-text-muted hover:text-error" aria-label="Delete">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {q.options.map((opt, idx) => (
                  <li
                    key={idx}
                    className={cx("text-body-sm", idx === q.correct_index ? "font-semibold text-success" : "text-text-secondary")}
                  >
                    {LETTERS[idx]}. {opt} {idx === q.correct_index && "✓"}
                  </li>
                ))}
              </ul>
              {q.explanation && <p className="mt-2 text-caption text-text-muted">{q.explanation}</p>}
            </div>
          ))}
        </div>
      )}

      {modalOpen && <AddQuestionModal defaultCategory={category} onClose={() => setModalOpen(false)} />}
    </div>
  );
}
