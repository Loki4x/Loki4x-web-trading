// Aman dipakai di komponen klien (tidak mengimpor Supabase server).
// Aturannya sama dengan lib/tier.ts dan fungsi database user_has_tier:
// tier berbayar dengan vip_expires_at yang sudah lewat dianggap FREE, tanpa mengubah data yang tersimpan.

export type TierName = "FREE" | "VIP" | "MEMBERSHIP";

export interface MembershipState {
  /** Tier yang berlaku SEKARANG (kedaluwarsa -> FREE). */
  effectiveTier: TierName;
  /** Tier yang tersimpan di database. */
  storedTier: TierName;
  expiresAt: string | null;
  /** Tier berbayar yang masa aktifnya sudah lewat. */
  expired: boolean;
  /** Tier berbayar tanpa batas waktu (lifetime, persetujuan IB, atau pemberian manual admin). */
  permanent: boolean;
  /** Sisa hari (dibulatkan ke atas); null kalau tidak berlaku. */
  daysLeft: number | null;
}

export function membershipState(
  p: { tier: string | null; vip_expires_at: string | null },
  now: number = Date.now()
): MembershipState {
  const storedTier: TierName = p.tier === "VIP" || p.tier === "MEMBERSHIP" ? p.tier : "FREE";
  if (storedTier === "FREE") {
    return { effectiveTier: "FREE", storedTier, expiresAt: null, expired: false, permanent: false, daysLeft: null };
  }

  const expiresAt = p.vip_expires_at ?? null;
  if (expiresAt === null) {
    return { effectiveTier: storedTier, storedTier, expiresAt, expired: false, permanent: true, daysLeft: null };
  }

  const diff = new Date(expiresAt).getTime() - now;
  const expired = diff < 0;
  return {
    effectiveTier: expired ? "FREE" : storedTier,
    storedTier,
    expiresAt,
    expired,
    permanent: false,
    daysLeft: expired ? null : Math.ceil(diff / 86_400_000),
  };
}
