"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserTier, hasAccess } from "@/lib/tier";
import { getT } from "@/lib/i18n/server";
import { ACADEMY_CATEGORIES, type QuizResult } from "@/lib/academy";
import { gradeAndRecordQuiz, missingAcademyTable } from "@/lib/academy-core";

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
      message: missingAcademyTable(error.message)
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
  const res = await gradeAndRecordQuiz(ctx.user.id, categorySlug, answers, t);
  if (res.success) revalidatePath(`/academy/${categorySlug}`);
  return res;
}
