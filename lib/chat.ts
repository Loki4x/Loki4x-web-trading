export const CHAT_MAX_LEN = 1000;

export type ChatSender = "USER" | "ADMIN";

export interface ChatMessage {
  id: string;
  thread_id: string;
  sender_role: ChatSender;
  body: string;
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

export type ChatError = "auth" | "empty" | "too_long" | "rate_limited" | "suspended" | "failed";

export type SendResult =
  | { ok: true; message: ChatMessage; threadId: string }
  | { ok: false; error: ChatError };

export function chatPreview(body: string) {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > 80 ? `${flat.slice(0, 77)}...` : flat;
}
