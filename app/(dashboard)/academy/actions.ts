"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentUserTier, hasAccess } from "@/lib/tier";
import { getT } from "@/lib/i18n/server";
import { rateLimit } from "@/lib/rate-limit";
import { ACADEMY_CATEGORIES, gradeQuiz, type QuizQuestion, type QuizResult } from "@/lib/academy";

const VIDEO_ID_RE = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\d{1,18})$/i;

async function memberUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  if (!hasAccess(await getCurrentUserTier(), "MEMBERSHIP")) return null;
  return { supabase, user };
}

function missingTable(message: string) {
  return /academy_video_progress|academy_quiz|relation|schema cache/i.test(message);
}

/** Tandai / batalkan tanda "sudah ditonton" untuk satu video. */
export async function setVideoWatched(videoId: string, watched: boolean) {
  const { t } = await getT();
  const ctx = await memberUser();
  if (!ctx) return { success: false as const, message: t("Fitur ini khusus member Membership.") };
  if (!VIDEO_ID_RE.test(String(videoId))) return { success: false as const, message: "Invalid video" };

  const { supabase, user } = ctx;
  const { error } = watched
    ? await supabase
        .from("academy_video_progress")
        .upsert({ user_id: user.id, video_id: videoId }, { onConflict: "user_id,video_id", ignoreDuplicates: true })
    : await supabase.from("academy_video_progress").delete().eq("user_id", user.id).eq("video_id", videoId);

  if (error) {
    return {
      success: false as const,
      message: missingTable(error.message)
        ? t("Database belum diperbarui. Admin perlu menjalankan supabase/academy-progress-quiz.sql.")
        : error.message,
    };
  }
  for (const slug of Object.keys(ACADEMY_CATEGORIES)) revalidatePath(`/academy/${slug}`);
  return { success: true as const };
}

/** Nilai kuis di server (kunci jawaban tidak pernah dikirim ke browser sebelum dikumpulkan). */
export async function submitQuiz(
  categorySlug: string,
  answers: Record<string, number>
): Promise<{ success: true; result: QuizResult } | { success: false; message: string }> {
  const { t } = await getT();
  const ctx = await memberUser();
  if (!ctx) return { success: false, message: t("Fitur ini khusus member Membership.") };
  const meta = ACADEMY_CATEGORIES[categorySlug];
  if (!meta || typeof answers !== "object" || answers === null) return { success: false, message: "Invalid request" };

  if (!(await rateLimit(`academy-quiz:${ctx.user.id}`, 10, 60 * 60))) {
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
      message: missingTable(error.message)
        ? t("Database belum diperbarui. Admin perlu menjalankan supabase/academy-progress-quiz.sql.")
        : error.message,
    };
  }
  const questions = (data ?? []) as QuizQuestion[];
  if (questions.length === 0) return { success: false, message: t("Kuis untuk kategori ini belum tersedia.") };

  // Urutkan hasil sesuai urutan soal yang dikerjakan member.
  const order = Object.keys(answers);
  questions.sort((a, b) => {
    const ia = order.indexOf(a.id);
    const ib = order.indexOf(b.id);
    return (ia < 0 ? 1e9 : ia) - (ib < 0 ? 1e9 : ib);
  });
  const result = gradeQuiz(questions, answers);

  const { error: insertError } = await service.from("academy_quiz_attempts").insert({
    user_id: ctx.user.id,
    category: meta.db,
    score: result.score,
    total: result.total,
    passed: result.passed,
  });
  if (insertError) console.error("[academy] gagal simpan hasil kuis:", insertError.message);

  revalidatePath(`/academy/${categorySlug}`);
  return { success: true, result };
}
