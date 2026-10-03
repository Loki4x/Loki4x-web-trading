import { isLifetimePlan, planToTier, type Plan } from "@/lib/pakasir-constants";

type TierName = "FREE" | "VIP" | "MEMBERSHIP";
const RANK: Record<TierName, number> = { FREE: 0, VIP: 1, MEMBERSHIP: 2 };
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export interface MembershipFields {
  tier: string | null;
  vip_expires_at: string | null;
}

/**
 * Hitung tier + masa aktif baru setelah user membayar `plan`.
 * Dipakai oleh pembayaran otomatis (Pakasir) DAN approval USDT manual,
 * supaya keduanya selalu konsisten.
 *
 * Aturan:
 * - Tier aktif yang LEBIH TINGGI dari paket yang dibayar tidak pernah diturunkan.
 * - Lifetime selalu jadi MEMBERSHIP tanpa batas waktu.
 * - Membership/VIP yang sudah tanpa batas waktu tidak ditimpa dengan masa aktif 30 hari.
 * - Paket bulanan: +30 hari dari tanggal berakhir saat ini (kalau masih aktif), atau dari sekarang.
 */
export function computeGrant(current: MembershipFields, plan: Plan, now = new Date()): MembershipFields {
  const storedTier: TierName = current.tier === "VIP" || current.tier === "MEMBERSHIP" ? current.tier : "FREE";
  const expiry = current.vip_expires_at ? new Date(current.vip_expires_at) : null;
  const active = storedTier !== "FREE" && (expiry === null || expiry > now);
  const activeTier: TierName = active ? storedTier : "FREE";
  const unchanged: MembershipFields = { tier: current.tier, vip_expires_at: current.vip_expires_at };

  const newTier = planToTier(plan);

  // Jangan pernah menurunkan tier yang sedang aktif.
  if (RANK[activeTier] > RANK[newTier]) return unchanged;

  if (isLifetimePlan(plan)) return { tier: "MEMBERSHIP", vip_expires_at: null };

  // Sudah permanen di tier yang sama -> tidak ada yang perlu diubah.
  if (active && expiry === null && activeTier === newTier) return unchanged;

  const base = active && expiry ? expiry : now;
  return { tier: newTier, vip_expires_at: new Date(base.getTime() + THIRTY_DAYS_MS).toISOString() };
}
