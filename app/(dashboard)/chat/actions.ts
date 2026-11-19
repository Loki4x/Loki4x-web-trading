"use server";

import { createClient } from "@/lib/supabase/server";
import type { SendResult } from "@/lib/chat";
import { deliverChatCore, markChatReadCore } from "@/lib/chat-core";

// Logika ada di lib/chat-core.ts (dipakai juga oleh API aplikasi Android).

async function ctx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { supabase, user } : null;
}

export async function sendChatMessage(rawBody: string): Promise<SendResult> {
  const c = await ctx();
  if (!c) return { ok: false, error: "auth" };
  return deliverChatCore(c, rawBody, null);
}

/** FormData: `image` (File, wajib) dan `caption` (teks opsional). */
export async function sendChatImage(formData: FormData): Promise<SendResult> {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "bad_image" };
  const c = await ctx();
  if (!c) return { ok: false, error: "auth" };
  return deliverChatCore(c, formData.get("caption"), file);
}

/** User membuka chat: tandai balasan admin sebagai sudah dibaca. */
export async function markChatReadByUser(): Promise<void> {
  const c = await ctx();
  if (c) await markChatReadCore(c);
}
