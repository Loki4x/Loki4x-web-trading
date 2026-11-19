import { mobileTierAuth } from "@/lib/mobile-auth";
import { getMarketNews } from "@/lib/market-news";

export const dynamic = "force-dynamic";

// GET /api/mobile/market-news → berita Fundamental Pasar (Investing.com). Khusus Membership.
export async function GET(request: Request) {
  const auth = await mobileTierAuth(request, "MEMBERSHIP");
  if (auth instanceof Response) return auth;
  return Response.json({ news: await getMarketNews() });
}
