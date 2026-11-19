import { getMobileUser } from "@/lib/mobile-auth";
import { getUserT } from "@/lib/i18n/server";
import { claimReferralWithMessage } from "@/lib/referral-claim";

export const dynamic = "force-dynamic";

// POST /api/mobile/referral/claim → klaim saldo hari referral menjadi VIP.
export async function POST(request: Request) {
  const auth = await getMobileUser(request);
  if (!auth) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { t } = await getUserT(auth.supabase, auth.user.id);
  return Response.json(await claimReferralWithMessage(auth.user.id, t));
}
