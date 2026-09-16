import { createClient } from "@/lib/supabase/server";
import { VipRequestsTable } from "@/components/admin/VipRequestsTable";

export default async function AdminVipRequestsPage() {
  const supabase = await createClient();

  const { data: requests } = await supabase
    .from("vip_ib_requests")
    .select("*, profiles(full_name, email)")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">VIP Requests</h1>
        <p className="text-body-sm text-text-secondary">Pengajuan upgrade VIP via IB broker.</p>
      </div>

      <VipRequestsTable requests={requests ?? []} />
    </main>
  );
}
