// Konstanta yang aman diimport dari Client Component (tidak ada fetch/secret
// di sini). Logika server (call API Pakasir) tetap di lib/pakasir.ts.

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

export type PakasirMethod =
  | "qris"
  | "bri_va"
  | "bni_va"
  | "cimb_niaga_va"
  | "bnc_va"
  | "maybank_va"
  | "permata_va"
  | "atm_bersama_va"
  | "artha_graha_va"
  | "sampoerna_va";

export const BANK_VA_METHODS: { method: PakasirMethod; label: string }[] = [
  { method: "bri_va", label: "BRI" },
  { method: "bni_va", label: "BNI" },
  { method: "cimb_niaga_va", label: "CIMB Niaga" },
  { method: "permata_va", label: "Permata" },
  { method: "maybank_va", label: "Maybank" },
  { method: "bnc_va", label: "BNC" },
  { method: "atm_bersama_va", label: "ATM Bersama" },
  { method: "artha_graha_va", label: "Artha Graha" },
  { method: "sampoerna_va", label: "Sampoerna" },
];
