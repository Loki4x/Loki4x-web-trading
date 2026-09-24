import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { parseUserAgent } from "@/lib/login-activity";
import { SettingsClient } from "@/components/settings/SettingsClient";
import type { Profile, LoginActivity } from "@/lib/types";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user?.id ?? "")
    .single();

  const { data: loginActivity } = await supabase
    .from("login_activity")
    .select("*")
    .eq("user_id", user?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(8);

  const h = await headers();
  const currentIp = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "";
  const currentUserAgent = h.get("user-agent") ?? "";
  const currentDevice = parseUserAgent(currentUserAgent);

  const identities = user?.identities ?? [];
  const isGoogleUser = identities.some((i) => i.provider === "google");
  const hasPassword = identities.some((i) => i.provider === "email");

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">Pengaturan</h1>
        <p className="text-body-sm text-text-secondary">
          Kelola profil, keamanan, notifikasi, dan preferensi Anda.
        </p>
      </div>

      <SettingsClient
        profile={(profile as Profile) ?? null}
        email={user?.email ?? ""}
        isGoogleUser={isGoogleUser}
        hasPassword={hasPassword}
        memberSince={profile?.created_at ?? user?.created_at ?? ""}
        loginActivity={(loginActivity ?? []) as LoginActivity[]}
        currentDevice={currentDevice}
        currentIp={currentIp}
      />
    </main>
  );
}
