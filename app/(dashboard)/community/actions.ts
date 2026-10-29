"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { rateLimit } from "@/lib/rate-limit";
import {
  COMMUNITY_COLUMNS,
  COMMUNITY_MAX_LEN,
  canAccessRoom,
  isRoom,
  type CommunityMessage,
  type CommunitySendResult,
} from "@/lib/community";
import type { Tier } from "@/lib/tier";
import { uploadCommunityImage } from "@/lib/chat-upload";

function displayName(fullName: string | null, email: string | null) {
  const name = (fullName ?? "").trim() || (email ?? "").split("@")[0] || "Member";
  return name.length > 24 ? `${name.slice(0, 24)}…` : name;
}

/** Kirim pesan (dan/atau foto) ke ruang chat komunitas. Tier dicek ulang di server (tier lebih tinggi boleh ke ruang di bawahnya). */
async function deliver(room: string, rawBody: unknown, file: File | null): Promise<CommunitySendResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "auth" };

  if (!isRoom(room)) return { ok: false, error: "forbidden" };

  const body = typeof rawBody === "string" ? rawBody.trim() : "";
  if (!body && !file) return { ok: false, error: "empty" };
  if (body.length > COMMUNITY_MAX_LEN) return { ok: false, error: "too_long" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, tier, vip_expires_at, is_admin, is_suspended")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return { ok: false, error: "auth" };
  if (profile.is_suspended) return { ok: false, error: "suspended" };

  const stored: Tier = profile.tier === "VIP" || profile.tier === "MEMBERSHIP" ? profile.tier : "FREE";
  const expired = !!profile.vip_expires_at && new Date(profile.vip_expires_at).getTime() <= Date.now();
  const effective: Tier = profile.is_admin ? "MEMBERSHIP" : stored !== "FREE" && expired ? "FREE" : stored;
  if (!canAccessRoom(effective, room)) return { ok: false, error: "forbidden" };

  if (!(await rateLimit(`community:${user.id}`, 12, 60))) return { ok: false, error: "rate_limited" };
  if (file && !(await rateLimit(`community-img:${user.id}`, 10, 600))) return { ok: false, error: "rate_limited" };

  try {
    let imageKey: string | null = null;
    if (file) {
      const up = await uploadCommunityImage(file, room);
      if (!up.ok) return { ok: false, error: up.error === "image_too_big" ? "image_too_big" : up.error === "bad_image" ? "bad_image" : "failed" };
      imageKey = up.key;
    }

    const { data, error } = await createServiceClient()
      .from("community_messages")
      .insert({
        room,
        user_id: user.id,
        author_name: displayName(profile.full_name, profile.email),
        author_tier: effective,
        is_admin: !!profile.is_admin,
        body,
        image_key: imageKey,
      })
      .select(COMMUNITY_COLUMNS)
      .single();
    if (error || !data) throw error ?? new Error("pesan kosong");
    return { ok: true, message: data as CommunityMessage };
  } catch (err) {
    console.error("[community/send]", err instanceof Error ? err.message : err);
    return { ok: false, error: "failed" };
  }
}

export async function sendCommunityMessage(room: string, rawBody: string): Promise<CommunitySendResult> {
  return deliver(room, rawBody, null);
}

/** FormData: `room`, `image` (File, wajib) dan `caption` (teks opsional). */
export async function sendCommunityImage(formData: FormData): Promise<CommunitySendResult> {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "bad_image" };
  return deliver(String(formData.get("room") ?? ""), formData.get("caption"), file);
}

/** Hanya admin: hapus pesan (moderasi). */
export async function deleteCommunityMessage(id: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!profile?.is_admin) return { ok: false };

  const { error } = await createServiceClient().from("community_messages").delete().eq("id", id);
  if (error) {
    console.error("[community/delete]", error.message);
    return { ok: false };
  }
  return { ok: true };
}
