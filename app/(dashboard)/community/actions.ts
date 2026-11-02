"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { rateLimit } from "@/lib/rate-limit";
import {
  COMMUNITY_COLUMNS,
  COMMUNITY_IMAGE_KEY_RE,
  COMMUNITY_MAX_LEN,
  COMMUNITY_MAX_MENTIONS,
  ROOM_LABEL,
  canAccessRoom,
  isRoom,
  type CommunityMessage,
  type CommunitySendResult,
} from "@/lib/community";
import type { Tier } from "@/lib/tier";
import { uploadCommunityImage } from "@/lib/chat-upload";
import { deletePrivateR2Object } from "@/lib/r2";
import { notifyUser } from "@/lib/notifications";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clip = (v: string, n: number) => (v.length > n ? `${v.slice(0, n - 1)}…` : v);

type Extras = { replyTo?: unknown; mentionIds?: unknown };

function displayName(fullName: string | null, email: string | null) {
  const name = (fullName ?? "").trim() || (email ?? "").split("@")[0] || "Member";
  return name.length > 24 ? `${name.slice(0, 24)}…` : name;
}

/** Kirim pesan (dan/atau foto) ke ruang chat komunitas. Tier dicek ulang di server (tier lebih tinggi boleh ke ruang di bawahnya). */
async function deliver(room: string, rawBody: unknown, file: File | null, extras: Extras = {}): Promise<CommunitySendResult> {
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
  // Ruang Pengumuman: hanya admin yang boleh menulis.
  if (room === "ANNOUNCEMENT" && !profile.is_admin) return { ok: false, error: "forbidden" };

  if (!(await rateLimit(`community:${user.id}`, 12, 60))) return { ok: false, error: "rate_limited" };
  if (file && !(await rateLimit(`community-img:${user.id}`, 10, 600))) return { ok: false, error: "rate_limited" };

  const service = createServiceClient();

  // Balasan: pesan yang dibalas harus ada di ruang yang sama. Cuplikannya disimpan supaya tetap tampil walau pesan aslinya dihapus.
  let reply: { id: string; user_id: string; name: string; excerpt: string } | null = null;
  if (typeof extras.replyTo === "string" && UUID_RE.test(extras.replyTo)) {
    const { data: target } = await service
      .from("community_messages")
      .select("id, user_id, author_name, body, image_key")
      .eq("id", extras.replyTo)
      .eq("room", room)
      .maybeSingle();
    if (target) {
      reply = {
        id: target.id,
        user_id: target.user_id,
        name: target.author_name,
        excerpt: clip((target.body ?? "").replace(/\s+/g, " ").trim() || (target.image_key ? "📷" : ""), 80),
      };
    }
  }

  try {
    let imageKey: string | null = null;
    if (file) {
      const up = await uploadCommunityImage(file, room);
      if (!up.ok) return { ok: false, error: up.error === "image_too_big" ? "image_too_big" : up.error === "bad_image" ? "bad_image" : "failed" };
      imageKey = up.key;
    }

    const { data, error } = await service
      .from("community_messages")
      .insert({
        room,
        user_id: user.id,
        author_name: displayName(profile.full_name, profile.email),
        author_tier: effective,
        is_admin: !!profile.is_admin,
        body,
        image_key: imageKey,
        reply_to: reply?.id ?? null,
        reply_name: reply?.name ?? null,
        reply_excerpt: reply?.excerpt ?? null,
      })
      .select(COMMUNITY_COLUMNS)
      .single();
    if (error || !data) throw error ?? new Error("pesan kosong");

    // Beri tahu orang yang disebut (@nama) dan penulis pesan yang dibalas. Gagal kirim notifikasi tidak membatalkan pesan.
    try {
      await notifyMentions({
        service,
        room,
        body,
        authorId: user.id,
        authorName: displayName(profile.full_name, profile.email),
        mentionIds: extras.mentionIds,
        replyAuthorId: reply?.user_id ?? null,
      });
    } catch (err) {
      console.error("[community/notify]", err instanceof Error ? err.message : err);
    }
    return { ok: true, message: data as CommunityMessage };
  } catch (err) {
    console.error("[community/send]", err instanceof Error ? err.message : err);
    return { ok: false, error: "failed" };
  }
}

async function notifyMentions({
  service,
  room,
  body,
  authorId,
  authorName,
  mentionIds,
  replyAuthorId,
}: {
  service: ReturnType<typeof createServiceClient>;
  room: string;
  body: string;
  authorId: string;
  authorName: string;
  mentionIds: unknown;
  replyAuthorId: string | null;
}) {
  if (!isRoom(room)) return;
  const wanted = new Set<string>();
  if (Array.isArray(mentionIds)) {
    for (const id of mentionIds.slice(0, COMMUNITY_MAX_MENTIONS)) if (typeof id === "string" && UUID_RE.test(id)) wanted.add(id);
  }
  if (replyAuthorId) wanted.add(replyAuthorId);
  wanted.delete(authorId);
  if (wanted.size === 0) return;

  const { data: people } = await service
    .from("profiles")
    .select("id, full_name, email, tier, vip_expires_at, is_admin, is_suspended")
    .in("id", Array.from(wanted));

  const preview = clip(body.replace(/\s+/g, " ").trim() || "📷", 120);
  const jobs: Promise<void>[] = [];
  for (const p of people ?? []) {
    if (p.is_suspended) continue;
    const stored: Tier = p.tier === "VIP" || p.tier === "MEMBERSHIP" ? p.tier : "FREE";
    const expired = !!p.vip_expires_at && new Date(p.vip_expires_at).getTime() <= Date.now();
    const effective: Tier = p.is_admin ? "MEMBERSHIP" : stored !== "FREE" && expired ? "FREE" : stored;
    if (!canAccessRoom(effective, room)) continue;

    // Mention hanya sah kalau namanya benar-benar tertulis di pesan; balasan selalu sah.
    const mentioned = body.includes(`@${displayName(p.full_name, p.email)}`);
    const isReplyTarget = p.id === replyAuthorId;
    if (!mentioned && !isReplyTarget) continue;

    jobs.push(
      notifyUser({
        userId: p.id,
        email: null,
        type: "ANNOUNCEMENT",
        title: mentioned ? `${authorName} menyebutmu di ${ROOM_LABEL[room]}` : `${authorName} membalas pesanmu di ${ROOM_LABEL[room]}`,
        message: preview,
        channels: { website: true, email: false, push: true },
        client: service,
        pushUrl: `/community?room=${room}`,
      })
    );
  }
  await Promise.allSettled(jobs);
}

/** `extras.replyTo`: id pesan yang dibalas; `extras.mentionIds`: id user yang disebut lewat @nama. */
export async function sendCommunityMessage(room: string, rawBody: string, extras: Extras = {}): Promise<CommunitySendResult> {
  return deliver(room, rawBody, null, extras);
}

/** FormData: `room`, `image` (File, wajib) dan `caption` (teks opsional). */
export async function sendCommunityImage(formData: FormData): Promise<CommunitySendResult> {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "bad_image" };
  let mentionIds: unknown = [];
  try {
    mentionIds = JSON.parse(String(formData.get("mentions") ?? "[]"));
  } catch {
    mentionIds = [];
  }
  return deliver(String(formData.get("room") ?? ""), formData.get("caption"), file, {
    replyTo: formData.get("reply_to"),
    mentionIds,
  });
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

  const service = createServiceClient();
  const { data: row } = await service.from("community_messages").select("image_key").eq("id", id).maybeSingle();

  const { error } = await service.from("community_messages").delete().eq("id", id);
  if (error) {
    console.error("[community/delete]", error.message);
    return { ok: false };
  }

  // Hapus juga berkas fotonya di R2 (hanya kunci dengan pola yang sah; kegagalan tidak membatalkan penghapusan pesan).
  if (row?.image_key && COMMUNITY_IMAGE_KEY_RE.test(row.image_key)) {
    await deletePrivateR2Object(row.image_key);
  }
  return { ok: true };
}

/** Hanya admin: sematkan / lepas sematan pesan. */
export async function pinCommunityMessage(id: string, pinned: boolean): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!profile?.is_admin) return { ok: false };

  const { error } = await createServiceClient()
    .from("community_messages")
    .update({ pinned_at: pinned ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) {
    console.error("[community/pin]", error.message);
    return { ok: false };
  }
  return { ok: true };
}

/** Member melaporkan pesan ke admin. Hanya pesan yang bisa dibaca pelapor (RLS), dan satu laporan per orang per pesan. */
export async function reportCommunityMessage(id: string): Promise<{ ok: boolean; error?: "auth" | "rate_limited" | "failed" }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "auth" };
  if (!(await rateLimit(`community-report:${user.id}`, 10, 600))) return { ok: false, error: "rate_limited" };

  // Lewat RLS: kalau user tidak boleh membaca pesan ini, hasilnya kosong.
  const { data: message } = await supabase.from("community_messages").select("id, user_id").eq("id", id).maybeSingle();
  if (!message || message.user_id === user.id) return { ok: false, error: "failed" };

  const { error } = await createServiceClient()
    .from("community_reports")
    .upsert({ message_id: id, reporter_id: user.id }, { onConflict: "message_id,reporter_id", ignoreDuplicates: true });
  if (error) {
    console.error("[community/report]", error.message);
    return { ok: false, error: "failed" };
  }
  return { ok: true };
}
