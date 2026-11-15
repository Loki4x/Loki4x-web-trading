import { createClient } from "@/lib/supabase/server";
import { AcademyAdminTable } from "@/components/admin/AcademyAdminTable";
import { QuizAdmin } from "@/components/admin/QuizAdmin";
import { getT } from "@/lib/i18n/server";
import type { QuizQuestion } from "@/lib/academy";

export default async function AdminAcademyPage() {
  const { t } = await getT();
  const supabase = await createClient();
  const [{ data: videos }, { data: questions, error: quizError }] = await Promise.all([
    supabase
      .from("academy_videos")
      .select("id, category, title, description, thumbnail_url, video_url")
      .order("created_at", { ascending: false }),
    supabase
      .from("academy_quiz_questions")
      .select("id, category, question, options, correct_index, explanation")
      .order("created_at", { ascending: true }),
  ]);

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">Academy</h1>
        <p className="text-body-sm text-text-secondary">{t("Kelola video edukasi untuk semua kategori.")}</p>
      </div>

      <AcademyAdminTable videos={(videos ?? []).map((v) => ({ ...v, id: String(v.id) }))} />

      <div className="mb-4 mt-10">
        <h2 className="text-h3 text-text-primary">{t("Kuis")}</h2>
        <p className="text-body-sm text-text-secondary">
          {t("Soal pilihan ganda per kategori. Member lulus kalau skornya minimal 70%.")}
        </p>
      </div>
      {quizError ? (
        <div className="card text-body-sm text-warning">
          {t("Tabel kuis belum ada. Jalankan supabase/academy-progress-quiz.sql di Supabase → SQL Editor.")}
        </div>
      ) : (
        <QuizAdmin questions={(questions ?? []) as QuizQuestion[]} />
      )}
    </main>
  );
}
