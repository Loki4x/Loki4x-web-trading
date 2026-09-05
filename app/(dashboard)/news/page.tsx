import { createClient } from "@/lib/supabase/server";
import { NewsTable } from "@/components/news/NewsTable";
import type { NewsEvent } from "@/lib/types";

export default async function NewsPage() {
  const supabase = await createClient();

  const { data: news } = await supabase
    .from("news")
    .select("*")
    .order("release_time", { ascending: true });

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <NewsTable events={(news ?? []) as NewsEvent[]} />
    </main>
  );
}
