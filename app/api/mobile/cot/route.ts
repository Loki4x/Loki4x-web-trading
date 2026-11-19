import { mobileTierAuth } from "@/lib/mobile-auth";
import { getCotSnapshot } from "@/lib/cot";

export const dynamic = "force-dynamic";

// GET /api/mobile/cot → posisi institusi (CFTC) minggu terakhir. Khusus VIP, sama dengan /cot di web.
export async function GET(request: Request) {
  const auth = await mobileTierAuth(request, "VIP");
  if (auth instanceof Response) return auth;
  return Response.json(await getCotSnapshot());
}
