import type { Tier } from "@/lib/tier";

export type Room = "FREE" | "VIP" | "MEMBERSHIP";

export const ROOMS: Room[] = ["FREE", "VIP", "MEMBERSHIP"];
export const ROOM_RANK: Record<Room, number> = { FREE: 0, VIP: 1, MEMBERSHIP: 2 };
export const ROOM_LABEL: Record<Room, string> = { FREE: "Free", VIP: "VIP", MEMBERSHIP: "Membership" };

export const COMMUNITY_MAX_LEN = 500;
export const COMMUNITY_PAGE_SIZE = 50;
export const COMMUNITY_COLUMNS = "id, room, user_id, author_name, author_tier, is_admin, body, image_key, created_at";

// Pola kunci foto di R2: community/<RUANG>/<uuid>-<timestamp>.<ext>
export const COMMUNITY_IMAGE_KEY_RE = /^community\/(FREE|VIP|MEMBERSHIP)\/[0-9a-f-]{36}-\d{10,16}\.(jpg|png|webp)$/i;

export function communityImageUrl(key: string) {
  return `/api/community/image?key=${encodeURIComponent(key)}`;
}

export interface CommunityMessage {
  id: string;
  room: Room;
  user_id: string;
  author_name: string;
  author_tier: string;
  is_admin: boolean;
  body: string;
  image_key: string | null;
  created_at: string;
}

export type CommunityError =
  | "auth"
  | "empty"
  | "too_long"
  | "rate_limited"
  | "suspended"
  | "forbidden"
  | "bad_image"
  | "image_too_big"
  | "failed";

export type CommunitySendResult = { ok: true; message: CommunityMessage } | { ok: false; error: CommunityError };

export function isRoom(v: unknown): v is Room {
  return v === "FREE" || v === "VIP" || v === "MEMBERSHIP";
}

/** Tier lebih tinggi boleh masuk ruang tier di bawahnya (Membership > VIP > Free). */
export function canAccessRoom(tier: Tier, room: Room) {
  return ROOM_RANK[tier as Room] >= ROOM_RANK[room];
}

