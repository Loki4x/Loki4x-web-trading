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

export interface MembershipStatus {
  /** Tier yang berlaku SEKARANG (kalau masa aktif sudah habis -> FREE). */
  tier: Tier;
  /** Tier yang tersimpan di database (bisa masih VIP/MEMBERSHIP walau sudah kedaluwarsa). */
  storedTier: Tier;
  /** Tanggal kedaluwarsa (ISO), null = tidak ada batas waktu. */
  expiresAt: string | null;
  /** True kalau tier berbayar tapi masa aktifnya sudah lewat. */
  expired: boolean;
  /** True kalau aktif dan tanpa batas waktu (lifetime, persetujuan IB, atau pemberian manual admin). */
  permanent: boolean;
}

const FREE_STATUS: MembershipStatus = {
  tier: "FREE",
  storedTier: "FREE",
  expiresAt: null,
  expired: false,
  permanent: false,
};

export async function getMembershipStatus(): Promise<MembershipStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return FREE_STATUS;

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, vip_expires_at")
    .eq("id", user.id)
    .single();

  if (!profile) return FREE_STATUS;

  const storedTier = (profile.tier as Tier) ?? "FREE";
  if (storedTier === "FREE") return FREE_STATUS;

  const expiresAt: string | null = profile.vip_expires_at ?? null;
  const expired = expiresAt !== null && new Date(expiresAt) < new Date();

  return {
    tier: expired ? "FREE" : storedTier,
    storedTier,
    expiresAt,
    expired,
    permanent: !expired && expiresAt === null,
  };
}

export async function getCurrentUserTier(): Promise<Tier> {
  return (await getMembershipStatus()).tier;
}
