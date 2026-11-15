import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { VideoGrid } from "@/components/academy/VideoGrid";
import { AcademyProgressCard } from "@/components/academy/AcademyProgressCard";
import { getCurrentUserTier, hasAccess } from "@/lib/tier";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { getT } from "@/lib/i18n/server";
import { ACADEMY_CATEGORIES } from "@/lib/academy";

export default async function AcademyCategoryPage({ params }: { params: { category: string } }) {
  const { t } = await getT();
  const tier = await getCurrentUserTier();
  if (!hasAccess(tier, "MEMBERSHIP")) {
    return <AccessDenied requiredTier="MEMBERSHIP" />;
  }

  const meta = ACADEMY_CATEGORIES[params.category];
  if (!meta) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: videos }, progressRes, attemptsRes, questionCount] = await Promise.all([
    supabase
      .from("academy_videos")
      .select("id, title, description, thumbnail_url, video_url")
      .eq("category", meta.db)
      .order("created_at", { ascending: false }),
    supabase.from("academy_video_progress").select("video_id").eq("user_id", user?.id ?? ""),
    supabase
      .from("academy_quiz_attempts")
      .select("score, total, passed, created_at")
      .eq("user_id", user?.id ?? "")
      .eq("category", meta.db)
      .order("created_at", { ascending: false })
      .limit(50),
    // Soal hanya bisa dibaca service role (ada kunci jawaban); di sini cukup jumlahnya.
    (async () => {
      try {
        const { count } = await createServiceClient()
          .from("academy_quiz_questions")
          .select("id", { count: "exact", head: true })
          .eq("category", meta.db);
        return count ?? 0;
      } catch {
        return 0;
      }
    })(),
  ]);

  const list = (videos ?? []).map((v) => ({ ...v, id: String(v.id) }));
  const ids = new Set(list.map((v) => v.id));
  // Kalau tabel progres belum ada (SQL belum dijalankan), fitur progres disembunyikan.
  const progressEnabled = !progressRes.error;
  const watchedIds = (progressRes.data ?? []).map((p) => String(p.video_id)).filter((id) => ids.has(id));

  const attempts = attemptsRes.data ?? [];
  const best = attempts.reduce<{ score: number; total: number; passed: boolean } | null>((b, a) => {
    const pct = a.total > 0 ? a.score / a.total : 0;
    const bestPct = b && b.total > 0 ? b.score / b.total : -1;
    return pct > bestPct ? a : b;
  }, null);

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">{t(meta.title)}</h1>
        <p className="text-body-sm text-text-secondary">{t(meta.subtitle)}</p>
      </div>

      {progressEnabled && (
        <div className="mb-6">
          <AcademyProgressCard
            slug={params.category}
            watched={watchedIds.length}
            totalVideos={list.length}
            questionCount={questionCount}
            attempts={attempts.length}
            best={best}
          />
        </div>
      )}

      <VideoGrid videos={list} watchedIds={progressEnabled ? watchedIds : null} />
    </main>
  );
}
