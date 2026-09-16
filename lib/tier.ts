import { createClient } from "@/lib/supabase/server";

export type Tier = "FREE" | "VIP" | "MEMBERSHIP";

const TIER_RANK: Record<Tier, number> = {
  FREE: 0,
  VIP: 1,
  MEMBERSHIP: 2,
};

export function hasAccess(userTier: Tier, requiredTier: Tier) {
  return TIER_RANK[userTier] >= TIER_RANK[requiredTier];
}

export async function getCurrentUserTier(): Promise<Tier> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "FREE";

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, vip_expires_at")
    .eq("id", user.id)
    .single();

  if (!profile) return "FREE";

  if (profile.tier !== "FREE" && profile.vip_expires_at) {
    const expired = new Date(profile.vip_expires_at) < new Date();
    if (expired) return "FREE";
  }

  return (profile.tier as Tier) ?? "FREE";
}
