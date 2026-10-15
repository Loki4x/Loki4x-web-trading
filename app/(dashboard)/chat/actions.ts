"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { rateLimit } from "@/lib/rate-limit";
import { CHAT_MAX_LEN, CHAT_MESSAGE_COLUMNS, chatPreview, type ChatMessage, type SendResult } from "@/lib/chat";
import { uploadChatImage } from "@/lib/chat-upload";

/** User mengirim pesan (dan/atau foto) ke tim support. Thread dibuat otomatis pada pesan pertama. */
async function deliver(rawBody: unknown, file: File | null): Promise<SendResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "auth" };

  const body = typeof rawBody === "string" ? rawBody.trim() : "";
  if (!body && !file) return { ok: false, error: "empty" };
  if (body.length > CHAT_MAX_LEN) return { ok: false, error: "too_long" };

  const { data: profile } = await supabase.from("profiles").select("is_suspended").eq("id", user.id).maybeSingle();
  if (profile?.is_suspended) return { ok: false, error: "suspended" };

  if (!(await rateLimit(`chat:${user.id}`, 20, 600))) return { ok: false, error: "rate_limited" };
  if (file && !(await rateLimit(`chat-img:${user.id}`, 8, 600))) return { ok: false, error: "rate_limited" };

  try {
    const svc = createServiceClient();

    const { data: thread, error: threadError } = await svc
      .from("chat_threads")
      .upsert({ user_id: user.id }, { onConflict: "user_id" })
      .select("id")
      .single();
    if (threadError || !thread) throw threadError ?? new Error("thread kosong");

    let imageKey: string | null = null;
    if (file) {
      const up = await uploadChatImage(file, thread.id);
      if (!up.ok) return { ok: false, error: up.error };
      imageKey = up.key;
    }

    const { data: message, error: messageError } = await svc
      .from("chat_messages")
      .insert({ thread_id: thread.id, sender_role: "USER", sender_id: user.id, body, image_key: imageKey })
      .select(CHAT_MESSAGE_COLUMNS)
      .single();
    if (messageError || !message) throw messageError ?? new Error("pesan kosong");

    await svc
      .from("chat_threads")
      .update({
        status: "OPEN",
        admin_unread: true,
        last_message_at: message.created_at,
        last_message_preview: chatPreview(body, !!imageKey),
      })
      .eq("id", thread.id);

    return { ok: true, message: message as ChatMessage, threadId: thread.id };
  } catch (err) {
    console.error("[chat/send]", err instanceof Error ? err.message : err);
    return { ok: false, error: "failed" };
  }
}

export async function sendChatMessage(rawBody: string): Promise<SendResult> {
  return deliver(rawBody, null);
}

/** FormData: `image` (File, wajib) dan `caption` (teks opsional). */
export async function sendChatImage(formData: FormData): Promise<SendResult> {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "bad_image" };
  return deliver(formData.get("caption"), file);
}

/** User membuka chat: tandai balasan admin sebagai sudah dibaca. */
export async function markChatReadByUser(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  try {
    await createServiceClient().from("chat_threads").update({ user_unread: false }).eq("user_id", user.id);
  } catch (err) {
    console.error("[chat/mark-read]", err instanceof Error ? err.message : err);
  }
}
