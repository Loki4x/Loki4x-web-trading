export type UsdtNetwork = "BEP20" | "TRC20";

export const USDT_WALLETS: Record<UsdtNetwork, { address: string; label: string }> = {
  BEP20: { address: "0xf62bc4e7d300e8cc00570a4cf03a933d685e0e85", label: "BNB Smart Chain (BEP20)" },
  TRC20: { address: "TMaZTH24BwhQfR1v7CdhzWEnrGfNtep8vu", label: "Tron (TRC20)" },
};

// 1 USDT ≈ 1 USD (stablecoin), jadi disamain langsung sama harga $ paket.
export const USDT_PRICE: Record<"VIP" | "MEMBERSHIP", number> = {
  VIP: 20,
  MEMBERSHIP: 35,
};
