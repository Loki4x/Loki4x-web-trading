import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentUserTier, hasAccess } from "@/lib/tier";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { getT } from "@/lib/i18n/server";
import { ACADEMY_CATEGORIES, QUIZ_PASS_PERCENT, shuffle, toPublicQuestion, type QuizQuestion } from "@/lib/academy";
import { QuizRunner } from "@/components/academy/QuizRunner";

export const dynamic = "force-dynamic";

export default async function AcademyQuizPage({ params }: { params: { category: string } }) {
  const { t } = await getT();
  if (!hasAccess(await getCurrentUserTier(), "MEMBERSHIP")) {
    return <AccessDenied requiredTier="MEMBERSHIP" />;
  }
  const meta = ACADEMY_CATEGORIES[params.category];
  if (!meta) notFound();

  // Soal dibaca dengan service role lalu kunci jawabannya dibuang sebelum dikirim ke browser.
  let questions: QuizQuestion[] = [];
  try {
    const { data } = await createServiceClient()
      .from("academy_quiz_questions")
      .select("id, category, question, options, correct_index, explanation")
      .eq("category", meta.db);
    questions = (data ?? []) as QuizQuestion[];
  } catch {
    questions = [];
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href={`/academy/${params.category}`}
        className="mb-4 inline-flex items-center gap-1 text-body-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("Kembali ke video")}
      </Link>
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">{t("Kuis {title}", { title: t(meta.title) })}</h1>
        <p className="text-body-sm text-text-secondary">
          {t("{n} soal pilihan ganda · lulus minimal {p}%", { n: questions.length, p: QUIZ_PASS_PERCENT })}
        </p>
      </div>

      {questions.length === 0 ? (
        <div className="card py-12 text-center text-body-sm text-text-muted">{t("Kuis untuk kategori ini belum tersedia.")}</div>
      ) : (
        <QuizRunner slug={params.category} questions={shuffle(questions).map(toPublicQuestion)} />
      )}
    </main>
  );
}
