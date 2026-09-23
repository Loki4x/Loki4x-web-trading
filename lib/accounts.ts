import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { TradingAccount } from "@/lib/types";

export const ACTIVE_ACCOUNT_COOKIE = "active_account_id";

/**
 * Fetches all trading accounts for a user. If the user has none yet,
 * automatically creates a default "Akun Utama" account so the app
 * always has at least one account to work with.
 * Then resolves which account should be considered "active" based on
 * (in order of priority): the requested account id (from ?account= query
 * param), the last account the user selected (stored in a cookie), or
 * finally falling back to the first account.
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
      .insert({ user_id: userId, name: "Akun Utama", initial_balance: 10000, currency: "USD" })
      .select("*")
      .single();
    accounts = created ? [created] : [];
  }

  const list = (accounts ?? []) as TradingAccount[];

  const cookieStore = await cookies();
  const cookieAccountId = cookieStore.get(ACTIVE_ACCOUNT_COOKIE)?.value;

  const active =
    list.find((a) => a.id === requestedAccountId) ??
    list.find((a) => a.id === cookieAccountId) ??
    list[0];

  return { accounts: list, activeAccount: active };
}
