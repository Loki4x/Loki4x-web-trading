import { createClient } from "@/lib/supabase/server";
import { NewsAdminTable } from "@/components/admin/NewsAdminTable";
import type { NewsEvent } from "@/lib/types";

export default async function AdminNewsPage() {
  const supabase = await createClient();
  const { data: news } = await supabase
    .from("news")
    .select("*")
    .order("release_time", { ascending: false });

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">Economic News</h1>
        <p className="text-body-sm text-text-secondary">Kelola kalender berita ekonomi.</p>
      </div>

      <NewsAdminTable events={(news ?? []) as NewsEvent[]} />
    </main>
  );
}
