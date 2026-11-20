"use server";

import { createClient } from "@/lib/supabase/server";
import {
  adminMarkChatReadCore,
  adminReplyCore,
  adminSetChatStatusCore,
  CHAT_BAD_IMAGE,
  type AdminReplyResult,
} from "@/lib/chat-admin-core";


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

export async function adminReplyChat(threadId: string, rawBody: string): Promise<AdminReplyResult> {
  const admin = await assertIsAdmin();
  return adminReplyCore(admin.id, threadId, rawBody, null);
}

/** FormData: `threadId`, `image` (File) dan `caption` (opsional). */
export async function adminReplyChatImage(formData: FormData): Promise<AdminReplyResult> {
  const admin = await assertIsAdmin();
  const threadId = formData.get("threadId");
  const file = formData.get("image");
  if (typeof threadId !== "string" || !threadId) return { ok: false, error: "Percakapan tidak valid." };
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: CHAT_BAD_IMAGE };
  return adminReplyCore(admin.id, threadId, formData.get("caption"), file);
}

export async function adminMarkChatRead(threadId: string): Promise<void> {
  await assertIsAdmin();
  await adminMarkChatReadCore(threadId);
}

export async function adminSetChatStatus(threadId: string, status: "OPEN" | "CLOSED"): Promise<void> {
  await assertIsAdmin();
  await adminSetChatStatusCore(threadId, status);
}
