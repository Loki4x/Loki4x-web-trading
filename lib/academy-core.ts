import { createServiceClient } from "@/lib/supabase/service";
import { rateLimit } from "@/lib/rate-limit";
import { ACADEMY_CATEGORIES, gradeQuiz, type AcademyCategory, type QuizQuestion, type QuizResult } from "@/lib/academy";

// Logika kuis Akademi yang dipakai bersama oleh server action web dan API aplikasi mobile.
// Soal dibaca dengan service role (ada kunci jawaban) dan TIDAK PERNAH dikirim utuh ke member.

type T = (key: string, vars?: Record<string, string | number>) => string;

export function missingAcademyTable(message: string) {
  return /academy_video_progress|academy_quiz|relation|schema cache/i.test(message);
}

/** Semua soal satu kategori (dengan kunci jawaban). Gagal → []. */
export async function loadQuizQuestions(category: AcademyCategory): Promise<QuizQuestion[]> {
  try {
    const { data } = await createServiceClient()
      .from("academy_quiz_questions")
      .select("id, category, question, options, correct_index, explanation")
      .eq("category", category);
    return (data ?? []) as QuizQuestion[];
  } catch {
    return [];
  }
}

/** Jumlah soal per kategori (slug → jumlah). */
export async function quizQuestionCounts(): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  await Promise.all(
    Object.entries(ACADEMY_CATEGORIES).map(async ([slug, meta]) => {
      try {
        const { count } = await createServiceClient()
          .from("academy_quiz_questions")
          .select("id", { count: "exact", head: true })
          .eq("category", meta.db);
        out[slug] = count ?? 0;
      } catch {
        out[slug] = 0;
      }
    })
  );
  return out;
}

/** Nilai jawaban di server lalu simpan hasilnya ke academy_quiz_attempts. */
export async function gradeAndRecordQuiz(
  userId: string,
  categorySlug: string,
  answers: unknown,
  t: T
): Promise<{ success: true; result: QuizResult } | { success: false; message: string }> {
  const meta = ACADEMY_CATEGORIES[categorySlug];
  if (!meta || typeof answers !== "object" || answers === null || Array.isArray(answers)) {
    return { success: false, message: "Invalid request" };
  }
  const cleanAnswers: Record<string, number> = {};
  for (const [k, v] of Object.entries(answers as Record<string, unknown>)) {
    if (typeof v === "number") cleanAnswers[k] = v;
  }

  if (!(await rateLimit(`academy-quiz:${userId}`, 10, 60 * 60))) {
    return { success: false, message: t("Terlalu banyak percobaan kuis. Coba lagi dalam 1 jam.") };
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("academy_quiz_questions")
    .select("id, category, question, options, correct_index, explanation")
    .eq("category", meta.db);
  if (error) {
    return {
      success: false,
      message: missingAcademyTable(error.message)
        ? t("Database belum diperbarui. Admin perlu menjalankan supabase/academy-progress-quiz.sql.")
        : error.message,
    };
  }
  const questions = (data ?? []) as QuizQuestion[];
  if (questions.length === 0) return { success: false, message: t("Kuis untuk kategori ini belum tersedia.") };

  // Urutkan hasil sesuai urutan soal yang dikerjakan member.
  const order = Object.keys(cleanAnswers);
  questions.sort((a, b) => {
    const ia = order.indexOf(a.id);
    const ib = order.indexOf(b.id);
    return (ia < 0 ? 1e9 : ia) - (ib < 0 ? 1e9 : ib);
  });
  const result = gradeQuiz(questions, cleanAnswers);

  const { error: insertError } = await service.from("academy_quiz_attempts").insert({
    user_id: userId,
    category: meta.db,
    score: result.score,
    total: result.total,
    passed: result.passed,
  });
  if (insertError) console.error("[academy] gagal simpan hasil kuis:", insertError.message);

  return { success: true, result };
}
