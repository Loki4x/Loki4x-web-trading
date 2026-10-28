"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/dictionary";

/**
 * Ganti bahasa dari tombol ID/EN di topbar. Selalu menyimpan cookie; kalau user sedang login,
 * pilihan juga disimpan di profil (dipakai untuk email dan notifikasi ke user ini).
 */
export async function setLanguage(next: string): Promise<{ ok: boolean }> {
  if (!isLocale(next)) return { ok: false };

  const store = await cookies();
  store.set(LOCALE_COOKIE, next, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from("profiles").update({ language: next }).eq("id", user.id);
      if (error) console.error("[setLanguage] gagal menyimpan ke profil:", error.message);
    }
  } catch (err) {
    console.error("[setLanguage]", err instanceof Error ? err.message : err);
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
