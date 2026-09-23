"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_ACCOUNT_COOKIE } from "@/lib/accounts";

/**
 * Diipanggil setiap kali user ganti akun aktif dari AccountControl,
 * supaya pilihan itu diingat di halaman lain (Journal, Reports, dst)
 * meskipun ?account= di URL nggak ikut ke-bawa.
 */
export async function setActiveAccount(accountId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ACCOUNT_COOKIE, accountId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 tahun
    sameSite: "lax",
  });
}

export async function createAccount(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false as const, message: "Not authenticated" };

  const { count } = await supabase
    .from("trading_accounts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((count ?? 0) >= 5) {
    return { success: false as const, message: "Maksimal 5 akun journaling per user." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const initialBalance = Number(formData.get("initial_balance") ?? 0);
  const currencyInput = String(formData.get("currency") ?? "USD").toUpperCase();
  const currency = currencyInput === "IDR" ? "IDR" : "USD";

  if (!name) {
    return { success: false as const, message: "Nama akun tidak boleh kosong." };
  }

  const { error } = await supabase.from("trading_accounts").insert({
    user_id: user.id,
    name,
    initial_balance: initialBalance,
    currency,
  });

  if (error) {
    return { success: false as const, message: error.message };
  }

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  revalidatePath("/trades");
  revalidatePath("/reports");

  return { success: true as const };
}

export async function deleteAccount(accountId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false as const, message: "Not authenticated" };

  const { count } = await supabase
    .from("trading_accounts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((count ?? 0) <= 1) {
    return { success: false as const, message: "Minimal harus ada 1 akun journaling." };
  }

  const { error } = await supabase
    .from("trading_accounts")
    .delete()
    .eq("id", accountId)
    .eq("user_id", user.id);

  if (error) {
    return { success: false as const, message: error.message };
  }

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  revalidatePath("/trades");
  revalidatePath("/reports");

  return { success: true as const };
}
