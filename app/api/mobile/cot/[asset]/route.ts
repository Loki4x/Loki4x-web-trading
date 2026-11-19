import { mobileTierAuth } from "@/lib/mobile-auth";
import { COT_WATCHLIST, getCotHistory } from "@/lib/cot";

export const dynamic = "force-dynamic";

// GET /api/mobile/cot/<LABEL> → histori mingguan 52 minggu satu aset (mis. GOLD, EUR). Khusus VIP.
export async function GET(request: Request, { params }: { params: { asset: string } }) {
  const auth = await mobileTierAuth(request, "VIP");
  if (auth instanceof Response) return auth;
  const label = params.asset.toUpperCase();
  if (!COT_WATCHLIST.some((w) => w.label === label)) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({ label, points: await getCotHistory(label) });
}
