import { getMobileUser } from "@/lib/mobile-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { SITE_URL } from "@/lib/site-url";
import { claimBlockReason, ensureReferralCode, maskEmail } from "@/lib/referral";
import { REFERRAL_CLAIM_THRESHOLD_DAYS, REFERRAL_MAX_REWARDS_PER_REFERRER, REFERRAL_REWARD_DAYS } from "@/lib/referral-config";

export const dynamic = "force-dynamic";

// GET /api/mobile/referral → link & kode undangan, saldo hari, daftar teman (email disamarkan). Sama dengan /referral.
export async function GET(request: Request) {
  const auth = await getMobileUser(request);
  if (!auth) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { supabase, user } = auth;
  const service = createServiceClient();
  const code = await ensureReferralCode(service, user.id);

  const { data } = await supabase
    .from("referrals")
    .select("id, referred_id, status, reward_days, claimed_at, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = data ?? [];
  const emails = new Map<string, string | null>();
  if (rows.length > 0) {
    const { data: profiles } = await service.from("profiles").select("id, email").in("id", rows.map((r) => r.referred_id));
    for (const p of profiles ?? []) emails.set(p.id as string, (p.email as string | null) ?? null);
  }
  const rewarded = rows.filter((r) => r.status === "REWARDED");
  const { data: me } = await supabase.from("profiles").select("tier, vip_expires_at").eq("id", user.id).single();

  return Response.json({
    code,
    link: code ? `${SITE_URL}/r/${code}` : null,
    balance: rewarded.filter((r) => !r.claimed_at).reduce((s, r) => s + r.reward_days, 0),
    claimedDays: rewarded.filter((r) => r.claimed_at).reduce((s, r) => s + r.reward_days, 0),
    invited: rows.length,
    joined: rewarded.length,
    blocked: me ? claimBlockReason(me) : null,
    threshold: REFERRAL_CLAIM_THRESHOLD_DAYS,
    rewardDays: REFERRAL_REWARD_DAYS,
    maxRewards: REFERRAL_MAX_REWARDS_PER_REFERRER,
    friends: rows.map((r) => ({
      id: r.id,
      email: maskEmail(emails.get(r.referred_id)),
      status: r.status,
      reward_days: r.reward_days,
      claimed: !!r.claimed_at,
      created_at: r.created_at,
    })),
  });
}
