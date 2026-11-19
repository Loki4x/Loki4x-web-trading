import { getMobileUser } from "@/lib/mobile-auth";
import { markChatReadCore } from "@/lib/chat-core";

export const dynamic = "force-dynamic";

// POST /api/mobile/chat/read → tandai balasan admin sudah dibaca.
export async function POST(request: Request) {
  const auth = await getMobileUser(request);
  if (!auth) return Response.json({ error: "auth" }, { status: 401 });
  await markChatReadCore(auth);
  return Response.json({ ok: true });
}
