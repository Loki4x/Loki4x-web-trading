"use server";

import { createClient } from "@/lib/supabase/server";
import type { CommunitySendResult } from "@/lib/community";
import {
  deleteCommunityMessageCore,
  deliverCommunityCore,
  pinCommunityMessageCore,
  reportCommunityMessageCore,
  searchMentionableCore,
  type Extras,
  type MemberCtx,
} from "@/lib/community-core";

// Logika ada di lib/community-core.ts (dipakai juga oleh API aplikasi Android).

async function ctx(): Promise<MemberCtx | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { supabase, user } : null;
}

/** `extras.replyTo`: id pesan yang dibalas; `extras.mentionIds`: id user yang disebut lewat @nama. */
export async function sendCommunityMessage(room: string, rawBody: string, extras: Extras = {}): Promise<CommunitySendResult> {
  const c = await ctx();
  if (!c) return { ok: false, error: "auth" };
  return deliverCommunityCore(c, room, rawBody, null, extras);
}

/** FormData: `room`, `image` (File, wajib) dan `caption` (teks opsional). */
export async function sendCommunityImage(formData: FormData): Promise<CommunitySendResult> {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "bad_image" };
  const c = await ctx();
  if (!c) return { ok: false, error: "auth" };
  let mentionIds: unknown = [];
  try {
    mentionIds = JSON.parse(String(formData.get("mentions") ?? "[]"));
  } catch {
    mentionIds = [];
  }
  return deliverCommunityCore(c, String(formData.get("room") ?? ""), formData.get("caption"), file, {
    replyTo: formData.get("reply_to"),
    mentionIds,
  });
}

export async function searchMentionable(room: string, query: string): Promise<{ id: string; name: string }[]> {
  const c = await ctx();
  return c ? searchMentionableCore(c, room, query) : [];
}

/** Hanya admin: hapus pesan (moderasi). */
export async function deleteCommunityMessage(id: string): Promise<{ ok: boolean }> {
  const c = await ctx();
  return c ? deleteCommunityMessageCore(c, id) : { ok: false };
}

/** Hanya admin: sematkan / lepas sematan pesan. */
export async function pinCommunityMessage(id: string, pinned: boolean): Promise<{ ok: boolean }> {
  const c = await ctx();
  return c ? pinCommunityMessageCore(c, id, pinned) : { ok: false };
}

export async function reportCommunityMessage(id: string): Promise<{ ok: boolean; error?: "auth" | "rate_limited" | "failed" }> {
  const c = await ctx();
  return c ? reportCommunityMessageCore(c, id) : { ok: false, error: "auth" };
}
