import { getMobileUser } from "@/lib/mobile-auth";
import { searchMentionableCore } from "@/lib/community-core";

export const dynamic = "force-dynamic";

// GET /api/mobile/community/mentions?room=FREE&q=and → member yang bisa disebut (@) di ruang itu.
export async function GET(request: Request) {
  const auth = await getMobileUser(request);
  if (!auth) return Response.json({ error: "auth" }, { status: 401 });
  const url = new URL(request.url);
  return Response.json({ people: await searchMentionableCore(auth, url.searchParams.get("room") ?? "", url.searchParams.get("q") ?? "") });
}
