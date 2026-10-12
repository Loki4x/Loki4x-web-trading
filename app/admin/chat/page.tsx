import { AdminChat } from "@/components/admin/AdminChat";
import { fetchAdminChatThreads } from "@/lib/chat-admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminChatPage() {
  const supabase = await createClient();
  const threads = await fetchAdminChatThreads(supabase);

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">Live Chat</h1>
        <p className="text-body-sm text-text-secondary">Balas pesan dari user yang menghubungi support lewat widget chat.</p>
      </div>

      <AdminChat initialThreads={threads} />
    </main>
  );
}
