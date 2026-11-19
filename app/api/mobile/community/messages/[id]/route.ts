import { getMobileUser } from "@/lib/mobile-auth";
import { deleteCommunityMessageCore, pinCommunityMessageCore, reportCommunityMessageCore } from "@/lib/community-core";

export const dynamic = "force-dynamic";

// POST /api/mobile/community/messages/<id> {action: "report" | "pin" | "unpin"}  (pin/unpin hanya admin)
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await getMobileUser(request);
  if (!auth) return Response.json({ error: "auth" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { action?: string } | null;
  const action = body?.action;
  const res =
    action === "report"
      ? await reportCommunityMessageCore(auth, params.id)
      : action === "pin" || action === "unpin"
        ? await pinCommunityMessageCore(auth, params.id, action === "pin")
        : { ok: false as const, error: "failed" as const };
  return Response.json(res, { status: res.ok ? 200 : 400 });
}

// DELETE /api/mobile/community/messages/<id>  (moderasi, hanya admin)
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const auth = await getMobileUser(request);
  if (!auth) return Response.json({ error: "auth" }, { status: 401 });
  const res = await deleteCommunityMessageCore(auth, params.id);
  return Response.json(res, { status: res.ok ? 200 : 403 });
}
