"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { CHAT_MAX_LEN, CHAT_MESSAGE_COLUMNS, chatPreview, type ChatMessage } from "@/lib/chat";
import { uploadChatImage } from "@/lib/chat-upload";

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

const IMAGE_ERRORS: Record<string, string> = {
  bad_image: "File harus berupa gambar (JPG, PNG, atau WebP).",
  image_too_big: "Foto terlalu besar (maksimal 2 MB).",
};

async function reply(threadId: string, rawBody: unknown, file: File | null): Promise<AdminReplyResult> {
  const admin = await assertIsAdmin();
  const body = typeof rawBody === "string" ? rawBody.trim() : "";
  if (!body && !file) return { ok: false, error: "Pesan kosong." };
  if (body.length > CHAT_MAX_LEN) return { ok: false, error: `Maksimal ${CHAT_MAX_LEN} karakter.` };

  try {
    const svc = createServiceClient();

    let imageKey: string | null = null;
    if (file) {
      const up = await uploadChatImage(file, threadId);
      if (!up.ok) return { ok: false, error: IMAGE_ERRORS[up.error] ?? "Foto gagal diunggah." };
      imageKey = up.key;
    }

    const { data: message, error } = await svc
      .from("chat_messages")
      .insert({ thread_id: threadId, sender_role: "ADMIN", sender_id: admin.id, body, image_key: imageKey })
      .select(CHAT_MESSAGE_COLUMNS)
      .single();
    if (error || !message) throw error ?? new Error("pesan kosong");

    await svc
      .from("chat_threads")
      .update({
        status: "OPEN",
        user_unread: true,
        admin_unread: false,
        last_message_at: message.created_at,
        last_message_preview: chatPreview(body, !!imageKey),
      })
      .eq("id", threadId);

    return { ok: true, message: message as ChatMessage };
  } catch (err) {
    console.error("[admin/chat/reply]", err instanceof Error ? err.message : err);
    return { ok: false, error: "Gagal mengirim balasan." };
  }
}

export async function adminReplyChat(threadId: string, rawBody: string): Promise<AdminReplyResult> {
  return reply(threadId, rawBody, null);
}

/** FormData: `threadId`, `image` (File) dan `caption` (opsional). */
export async function adminReplyChatImage(formData: FormData): Promise<AdminReplyResult> {
  const threadId = formData.get("threadId");
  const file = formData.get("image");
  if (typeof threadId !== "string" || !threadId) return { ok: false, error: "Percakapan tidak valid." };
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: IMAGE_ERRORS.bad_image };
  return reply(threadId, formData.get("caption"), file);
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
