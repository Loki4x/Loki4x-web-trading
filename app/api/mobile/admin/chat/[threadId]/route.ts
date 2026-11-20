import { NextResponse } from "next/server";
import { readJson } from "@/lib/mobile-journal";
import { adminAuth } from "@/lib/mobile-admin";
import { adminMarkChatReadCore, adminReplyCore, adminSetChatStatusCore, CHAT_BAD_IMAGE } from "@/lib/chat-admin-core";

export const dynamic = "force-dynamic";

// POST JSON {body}  atau  multipart: image (File), caption?  → balas sebagai admin.
export async function POST(request: Request, { params }: { params: { threadId: string } }) {
  const ctx = await adminAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  const adminId = ctx.actor.id ?? "";
  const type = request.headers.get("content-type") ?? "";
  let res;
  if (type.includes("multipart/form-data")) {
    const form = await request.formData().catch(() => null);
    const file = form?.get("image");
    if (!form || !(file instanceof File) || file.size === 0) return NextResponse.json({ error: CHAT_BAD_IMAGE }, { status: 400 });
    res = await adminReplyCore(adminId, params.threadId, form.get("caption"), file);
  } else {
    const body = (await readJson(request)) ?? {};
    res = await adminReplyCore(adminId, params.threadId, body.body, null);
  }
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
  return NextResponse.json(res);
}

// PATCH {read: true}  |  {status: "OPEN" | "CLOSED"}
export async function PATCH(request: Request, { params }: { params: { threadId: string } }) {
  const ctx = await adminAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  const body = (await readJson(request)) ?? {};
  if (body.read === true) await adminMarkChatReadCore(params.threadId);
  if (body.status === "OPEN" || body.status === "CLOSED") await adminSetChatStatusCore(params.threadId, body.status);
  return NextResponse.json({ ok: true });
}
