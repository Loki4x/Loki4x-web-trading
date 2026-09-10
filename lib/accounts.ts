import type { SupabaseClient } from "@supabase/supabase-js";
import type { TradingAccount } from "@/lib/types";

/**
 * Fetches all trading accounts for a user. If the user has none yet,
 * automatically creates a default "Akun Utama" account so the app
 * always has at least one account to work with.
 * Then resolves which account should be considered "active" based on
 * the requested account id (from ?account= query param), falling back
 * to the first account if the requested one doesn't belong to the user.
 */
export async function resolveActiveAccount(
  supabase: SupabaseClient,
  userId: string,
  requestedAccountId?: string
): Promise<{ accounts: TradingAccount[]; activeAccount: TradingAccount }> {
  let { data: accounts } = await supabase
    .from("trading_accounts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (!accounts || accounts.length === 0) {
    const { data: created } = await supabase
      .from("trading_accounts")
      .insert({ user_id: userId, name: "Akun Utama", initial_balance: 10000 })
      .select("*")
      .single();
    accounts = created ? [created] : [];
  }

  const list = (accounts ?? []) as TradingAccount[];
  const active = list.find((a) => a.id === requestedAccountId) ?? list[0];

  return { accounts: list, activeAccount: active };
}
