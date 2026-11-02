// Konstanta yang aman diimport dari Client Component (tidak ada fetch/secret
// di sini). Logika server pembayaran otomatis ada di lib/poketo.ts.

export type Plan = "VIP" | "MEMBERSHIP" | "MEMBERSHIP_LIFETIME";

// Konversi dari $20 / $35 / $70 pakai kurs ~Rp17.900/USD (per September 2026).
export const PLAN_PRICE_IDR: Record<Plan, number> = {
  VIP: 358_000,
  MEMBERSHIP: 627_000,
  MEMBERSHIP_LIFETIME: 1_253_000,
};

// Lifetime cuma varian bayar-sekali dari Membership — begitu lunas, tier
// yang di-set ke user tetap "MEMBERSHIP" (cuma vip_expires_at-nya dibiarkan
// kosong/null, artinya nggak pernah kedaluwarsa).
export function planToTier(plan: Plan): "VIP" | "MEMBERSHIP" {
  return plan === "MEMBERSHIP_LIFETIME" ? "MEMBERSHIP" : plan;
}

export function isLifetimePlan(plan: Plan): boolean {
  return plan === "MEMBERSHIP_LIFETIME";
}

export type MembershipTierName = "FREE" | "VIP" | "MEMBERSHIP";

/**
 * Paket yang boleh dibeli user sesuai statusnya sekarang. Dipakai di halaman
 * Upgrade (paket apa yang ditampilkan) DAN di server action pembayaran
 * (validasi), jadi keduanya selalu sepakat.
 *
 * - FREE / sudah kedaluwarsa : semua paket
 * - VIP aktif                : perpanjang VIP, atau naik ke Membership / Lifetime
 * - VIP tanpa batas waktu    : hanya naik ke Membership / Lifetime
 * - Membership aktif         : perpanjang, atau pindah ke Lifetime
 * - Membership tanpa batas   : tidak ada (sudah paling atas)
 *
 * Paket dengan tier LEBIH RENDAH dari tier aktif tidak pernah ditawarkan, supaya
 * user nggak bayar lalu malah turun tier.
 */
export function purchasablePlans(status: { tier: MembershipTierName; permanent: boolean }): Plan[] {
  if (status.tier === "FREE") return ["VIP", "MEMBERSHIP", "MEMBERSHIP_LIFETIME"];
  if (status.tier === "VIP") {
    return status.permanent ? ["MEMBERSHIP", "MEMBERSHIP_LIFETIME"] : ["VIP", "MEMBERSHIP", "MEMBERSHIP_LIFETIME"];
  }
  return status.permanent ? [] : ["MEMBERSHIP", "MEMBERSHIP_LIFETIME"];
}
