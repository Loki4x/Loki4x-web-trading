export const CHAT_MAX_LEN = 1000;
export const CHAT_IMAGE_MAX_BYTES = 2 * 1024 * 1024; // 2MB per foto
export const CHAT_MESSAGE_COLUMNS = "id, thread_id, sender_role, body, image_key, created_at";

// Pola kunci objek foto chat di R2: chat/<thread-id>/<uuid>-<timestamp>.<ext>
export const CHAT_IMAGE_KEY_RE = /^chat\/([0-9a-f-]{36})\/[0-9a-f-]{36}-\d{10,16}\.(jpg|png|webp)$/i;

export function chatImageUrl(key: string) {
  return `/api/chat/image?key=${encodeURIComponent(key)}`;
}

export type ChatSender = "USER" | "ADMIN";

export interface ChatMessage {
  id: string;
  thread_id: string;
  sender_role: ChatSender;
  body: string;
  image_key: string | null;
  created_at: string;
}

export interface ChatThread {
  id: string;
  user_id: string;
  status: "OPEN" | "CLOSED";
  user_unread: boolean;
  admin_unread: boolean;
  last_message_at: string;
  last_message_preview: string | null;
}

export type ChatError =
  | "auth"
  | "empty"
  | "too_long"
  | "rate_limited"
  | "suspended"
  | "bad_image"
  | "image_too_big"
  | "failed";

export type SendResult =
  | { ok: true; message: ChatMessage; threadId: string }
  | { ok: false; error: ChatError };

export function chatPreview(body: string, hasImage = false) {
  const flat = body.replace(/\s+/g, " ").trim();
  if (!flat) return hasImage ? "📷 Foto" : "";
  if (hasImage) return flat.length > 70 ? `📷 ${flat.slice(0, 67)}...` : `📷 ${flat}`;
  return flat.length > 80 ? `${flat.slice(0, 77)}...` : flat;
}
