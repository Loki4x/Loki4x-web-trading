import { getMobileUser } from "@/lib/mobile-auth";
import { deliverCommunityCore } from "@/lib/community-core";

export const dynamic = "force-dynamic";

// POST /api/mobile/community/messages
//   JSON: {room, body, reply_to?, mentions?: string[]}
//   multipart: room, image (File), caption?, reply_to?, mentions? (JSON array)
// Tier, rate limit, notifikasi mention/balasan sama dengan chat Komunitas di web.
export async function POST(request: Request) {
  const auth = await getMobileUser(request);
  if (!auth) return Response.json({ error: "auth" }, { status: 401 });
  const type = request.headers.get("content-type") ?? "";
  let res;
  if (type.includes("multipart/form-data")) {
    const form = await request.formData().catch(() => null);
    const file = form?.get("image");
    if (!form || !(file instanceof File) || file.size === 0) return Response.json({ error: "bad_image" }, { status: 400 });
    let mentions: unknown = [];
    try {
      mentions = JSON.parse(String(form.get("mentions") ?? "[]"));
    } catch {
      mentions = [];
    }
    res = await deliverCommunityCore(auth, String(form.get("room") ?? ""), form.get("caption"), file, {
      replyTo: form.get("reply_to"),
      mentionIds: mentions,
    });
  } else {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return Response.json({ error: "empty" }, { status: 400 });
    res = await deliverCommunityCore(auth, String(body.room ?? ""), body.body, null, { replyTo: body.reply_to, mentionIds: body.mentions });
  }
  if (!res.ok) return Response.json({ error: res.error }, { status: 400 });
  return Response.json(res);
}
