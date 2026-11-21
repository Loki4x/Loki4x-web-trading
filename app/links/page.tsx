import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { loadLinkPage } from "@/lib/link-page-core";
import { LinkPageView } from "@/components/links/LinkPageView";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  const { profile } = await loadLinkPage(supabase);
  const title = `${profile.display_name} | Links`;
  const description = profile.bio ?? "Semua link resmi Loki4x Academy.";
  return {
    title,
    description,
    alternates: { canonical: "/links" },
    openGraph: { title, description, ...(profile.avatar_url ? { images: [profile.avatar_url] } : {}) },
  };
}

/** Halaman link ala Linktree, diatur dari Admin → Link Page. Terbuka untuk umum (tanpa login). */
export default async function LinksPage() {
  const supabase = await createClient();
  const [{ profile, items }] = await Promise.all([
    loadLinkPage(supabase),
    // Hitung kunjungan (fungsi database; pengunjung tidak punya hak menulis tabel).
    supabase.rpc("increment_link_page_view").then(
      () => null,
      () => null
    ),
  ]);
  return <LinkPageView profile={profile} items={items} hrefFor={(item) => `/links/go/${item.id}`} />;
}
