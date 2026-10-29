import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMembershipStatus } from "@/lib/tier";
import { getT } from "@/lib/i18n/server";
import { CommunityChat } from "@/components/community/CommunityChat";
import { COMMUNITY_COLUMNS, COMMUNITY_PAGE_SIZE, isRoom, type CommunityMessage, type Room } from "@/lib/community";

export default async function CommunityPage({ searchParams }: { searchParams: { room?: string } }) {
  const { t } = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  const isAdmin = !!profile?.is_admin;
  const status = await getMembershipStatus();
  const tier = isAdmin ? "MEMBERSHIP" : status.tier;

  const initialRoom: Room = isRoom(searchParams?.room) ? searchParams.room : tier;

  const { data } = await supabase
    .from("community_messages")
    .select(COMMUNITY_COLUMNS)
    .eq("room", initialRoom)
    .order("created_at", { ascending: false })
    .limit(COMMUNITY_PAGE_SIZE);
  const initialMessages = ((data ?? []) as CommunityMessage[]).reverse();

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">{t("Komunitas")}</h1>
        <p className="text-body-sm text-text-secondary">
          {t("Ngobrol dengan sesama member. Tier lebih tinggi bisa ikut ruang tier di bawahnya.")}
        </p>
      </div>
      <CommunityChat
        userId={user.id}
        tier={tier}
        isAdmin={isAdmin}
        initialRoom={initialRoom}
        initialMessages={initialMessages}
      />
    </main>
  );
}
