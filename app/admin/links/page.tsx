import { createClient } from "@/lib/supabase/server";
import { loadLinkPage } from "@/lib/link-page-core";
import { LinkPageAdmin } from "@/components/admin/LinkPageAdmin";
import { SITE_URL } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function AdminLinksPage() {
  const supabase = await createClient();
  const { profile, items } = await loadLinkPage(supabase, true);

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">Link Page</h1>
        <p className="text-body-sm text-text-secondary">
          Halaman kumpulan link (seperti Linktree) di <span className="font-medium text-text-primary">/links</span>. Atur foto profil, bio, tema, ikon media sosial, dan daftar link.
        </p>
      </div>
      <LinkPageAdmin profile={profile} items={items} siteUrl={SITE_URL} />
    </main>
  );
}
