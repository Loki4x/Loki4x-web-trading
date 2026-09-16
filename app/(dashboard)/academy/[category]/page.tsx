import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VideoGrid } from "@/components/academy/VideoGrid";
import { getCurrentUserTier, hasAccess } from "@/lib/tier";
import { AccessDenied } from "@/components/ui/AccessDenied";

const categoryMap: Record<string, { db: string; title: string; subtitle: string }> = {
  technical: {
    db: "TECHNICAL",
    title: "Belajar Teknikal",
    subtitle: "Analisa chart, indikator, dan strategi teknikal.",
  },
  fundamental: {
    db: "FUNDAMENTAL",
    title: "Fundamental Forex",
    subtitle: "Ekonomi makro, berita, dan sentimen pasar.",
  },
  psychology: {
    db: "PSYCHOLOGY",
    title: "Psikologi & Risk",
    subtitle: "Manajemen risiko dan psikologi trading.",
  },
};

export default async function AcademyCategoryPage({ params }: { params: { category: string } }) {
  const tier = await getCurrentUserTier();
  if (!hasAccess(tier, "MEMBERSHIP")) {
    return <AccessDenied requiredTier="MEMBERSHIP" />;
  }

  const meta = categoryMap[params.category];
  if (!meta) notFound();

  const supabase = await createClient();
  const { data: videos } = await supabase
    .from("academy_videos")
    .select("id, title, description, thumbnail_url, video_url")
    .eq("category", meta.db)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">{meta.title}</h1>
        <p className="text-body-sm text-text-secondary">{meta.subtitle}</p>
      </div>

      <VideoGrid videos={videos ?? []} />
    </main>
  );
}
