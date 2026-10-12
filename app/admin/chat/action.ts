"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { CHAT_MAX_LEN, chatPreview, type ChatMessage } from "@/lib/chat";

async function assertIsAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) throw new Error("Not authorized");
  return user;
}

export type AdminReplyResult = { ok: true; message: ChatMessage } | { ok: false; error: string };

export async function adminReplyChat(threadId: string, rawBody: string): Promise<AdminReplyResult> {
  const admin = await assertIsAdmin();
  const body = typeof rawBody === "string" ? rawBody.trim() : "";
  if (!body) return { ok: false, error: "Pesan kosong." };
  if (body.length > CHAT_MAX_LEN) return { ok: false, error: `Maksimal ${CHAT_MAX_LEN} karakter.` };

  try {
    const svc = createServiceClient();
    const { data: message, error } = await svc
      .from("chat_messages")
      .insert({ thread_id: threadId, sender_role: "ADMIN", sender_id: admin.id, body })
      .select("id, thread_id, sender_role, body, created_at")
      .single();
    if (error || !message) throw error ?? new Error("pesan kosong");

    await svc
      .from("chat_threads")
      .update({
        status: "OPEN",
        user_unread: true,
        admin_unread: false,
        last_message_at: message.created_at,
        last_message_preview: chatPreview(body),
      })
      .eq("id", threadId);

    return { ok: true, message: message as ChatMessage };
  } catch (err) {
    console.error("[admin/chat/reply]", err instanceof Error ? err.message : err);
    return { ok: false, error: "Gagal mengirim balasan." };
  }
}

export async function adminMarkChatRead(threadId: string): Promise<void> {
  await assertIsAdmin();
  await createServiceClient().from("chat_threads").update({ admin_unread: false }).eq("id", threadId);
}

export async function adminSetChatStatus(threadId: string, status: "OPEN" | "CLOSED"): Promise<void> {
  await assertIsAdmin();
  if (status !== "OPEN" && status !== "CLOSED") return;
  await createServiceClient().from("chat_threads").update({ status }).eq("id", threadId);
}
