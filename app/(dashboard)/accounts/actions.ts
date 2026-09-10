"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

  if (!name) {
    return { success: false as const, message: "Nama akun tidak boleh kosong." };
  }

  const { error } = await supabase.from("trading_accounts").insert({
    user_id: user.id,
    name,
    initial_balance: initialBalance,
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
