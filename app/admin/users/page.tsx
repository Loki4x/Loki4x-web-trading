import { createClient } from "@/lib/supabase/server";
import { UsersTable } from "@/components/admin/UsersTable";

export default async function AdminUsersPage() {
  const supabase = await createClient();

  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, is_admin, tier, vip_expires_at, is_suspended, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">User Management</h1>
        <p className="text-body-sm text-text-secondary">Manage tiers, access, and account status.</p>
      </div>

      <UsersTable users={users ?? []} />
    </main>
  );
}
