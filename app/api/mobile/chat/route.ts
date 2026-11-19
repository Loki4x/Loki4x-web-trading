import { getMobileUser } from "@/lib/mobile-auth";
import { deliverChatCore } from "@/lib/chat-core";

export const dynamic = "force-dynamic";

// POST /api/mobile/chat  JSON {body}  atau  multipart: image (File), caption?
// Kirim pesan ke admin (support), sama dengan widget chat di web.
export async function POST(request: Request) {
  const auth = await getMobileUser(request);
  if (!auth) return Response.json({ error: "auth" }, { status: 401 });
  const type = request.headers.get("content-type") ?? "";
  let res;
  if (type.includes("multipart/form-data")) {
    const form = await request.formData().catch(() => null);
    const file = form?.get("image");
    if (!form || !(file instanceof File) || file.size === 0) return Response.json({ error: "bad_image" }, { status: 400 });
    res = await deliverChatCore(auth, form.get("caption"), file);
  } else {
    const body = (await request.json().catch(() => null)) as { body?: unknown } | null;
    res = await deliverChatCore(auth, body?.body, null);
  }
  if (!res.ok) return Response.json({ error: res.error }, { status: 400 });
  return Response.json(res);
}
