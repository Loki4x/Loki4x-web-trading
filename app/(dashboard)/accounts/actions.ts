"use server";

import { getT } from "@/lib/i18n/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_ACCOUNT_COOKIE } from "@/lib/accounts";
import { createAccountCore, deleteAccountCore, formGetter, updateAccountRulesCore } from "@/lib/journal-core";

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

function revalidateJournal() {
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  revalidatePath("/trades");
  revalidatePath("/reports");
}

export async function createAccount(formData: FormData) {
  const { t } = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false as const, message: "Not authenticated" };

  const result = await createAccountCore(supabase, user.id, formGetter(formData), t);
  if (!result.success) return result;
  revalidateJournal();
  return { success: true as const };
}

export async function deleteAccount(accountId: string) {
  const { t } = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false as const, message: "Not authenticated" };

  const result = await deleteAccountCore(supabase, user.id, accountId, t);
  if (result.success) revalidateJournal();
  return result;
}

/** Simpan aturan risiko & target untuk satu akun. Field kosong = aturan/target tidak dipakai. */
export async function updateAccountRules(accountId: string, formData: FormData) {
  const { t } = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false as const, message: "Not authenticated" };

  const result = await updateAccountRulesCore(supabase, user.id, accountId, formGetter(formData), t);
  if (result.success) {
    revalidatePath("/dashboard");
    revalidatePath("/trades");
  }
  return result;
}
