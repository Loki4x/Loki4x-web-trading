import { createClient } from "@/lib/supabase/server";
import { AcademyAdminTable } from "@/components/admin/AcademyAdminTable";
import { getT } from "@/lib/i18n/server";

export default async function AdminAcademyPage() {
  const { t } = await getT();
  const supabase = await createClient();
  const { data: videos } = await supabase
    .from("academy_videos")
    .select("id, category, title, description, thumbnail_url, video_url")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">Academy</h1>
        <p className="text-body-sm text-text-secondary">{t("Kelola video edukasi untuk semua kategori.")}</p>
      </div>

      <AcademyAdminTable videos={videos ?? []} />
    </main>
  );
}
