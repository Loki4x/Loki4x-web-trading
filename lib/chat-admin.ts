import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatThread } from "@/lib/chat";

export interface AdminChatThread extends ChatThread {
  name: string;
  email: string;
}

/** Daftar percakapan untuk admin (terbaru di atas), lengkap dengan nama dan email user. */
export async function fetchAdminChatThreads(supabase: SupabaseClient): Promise<AdminChatThread[]> {
  const { data: threads } = await supabase
    .from("chat_threads")
    .select("id, user_id, status, user_unread, admin_unread, last_message_at, last_message_preview")
    .order("last_message_at", { ascending: false })
    .limit(200);
  if (!threads || threads.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in(
      "id",
      threads.map((t) => t.user_id)
    );
  const byId = new Map((profiles ?? []).map((p) => [p.id as string, p]));

  return threads.map((t) => {
    const p = byId.get(t.user_id as string);
    return {
      ...(t as ChatThread),
      name: (p?.full_name as string) || "User",
      email: (p?.email as string) || "",
    };
  });
}
