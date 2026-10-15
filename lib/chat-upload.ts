import { randomUUID } from "crypto";
import { putPrivateR2Buffer } from "@/lib/r2";
import { CHAT_IMAGE_MAX_BYTES, type ChatError } from "@/lib/chat";

type Sniffed = { ext: "jpg" | "png" | "webp"; mime: string };

/** Tipe gambar ditentukan dari isi file (magic bytes), bukan dari nama atau tipe yang diklaim browser. */
function sniffImage(b: Buffer): Sniffed | null {
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (b.length > 12 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return { ext: "png", mime: "image/png" };
  if (b.length > 12 && b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP")
    return { ext: "webp", mime: "image/webp" };
  return null;
}

export type ChatUploadResult = { ok: true; key: string } | { ok: false; error: ChatError };

/** Validasi + simpan foto chat ke bucket R2 privat. Dipanggil hanya dari server action. */
export async function uploadChatImage(file: unknown, threadId: string): Promise<ChatUploadResult> {
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "bad_image" };
  if (file.size > CHAT_IMAGE_MAX_BYTES) return { ok: false, error: "image_too_big" };

  const buffer = Buffer.from(await file.arrayBuffer());
  const kind = sniffImage(buffer);
  if (!kind) return { ok: false, error: "bad_image" };

  const key = `chat/${threadId}/${randomUUID()}-${Date.now()}.${kind.ext}`;
  const saved = await putPrivateR2Buffer(key, buffer, kind.mime);
  return saved ? { ok: true, key } : { ok: false, error: "failed" };
}
