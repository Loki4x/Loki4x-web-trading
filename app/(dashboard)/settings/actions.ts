"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false as const, message: "Not authenticated" };

  const fullName = String(formData.get("full_name") ?? "").trim();
  const usernameRaw = String(formData.get("username") ?? "").trim();
  const username = usernameRaw.toLowerCase().replace(/[^a-z0-9_]/g, "");
  const bio = String(formData.get("bio") ?? "").slice(0, 160);

  if (!username) {
    return { success: false as const, message: "Username tidak boleh kosong." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, username, bio })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { success: false as const, message: "Username sudah dipakai, coba yang lain." };
    }
    return { success: false as const, message: error.message };
  }

  revalidatePath("/settings");
  return { success: true as const };
}

export async function updateAccountPrefs(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false as const, message: "Not authenticated" };

  const language = String(formData.get("language") ?? "id");
  const timezone = String(formData.get("timezone") ?? "Asia/Jakarta");

  const { error } = await supabase
    .from("profiles")
    .update({ language, timezone })
    .eq("id", user.id);

  if (error) {
    return { success: false as const, message: error.message };
  }

  revalidatePath("/settings");
  return { success: true as const };
}

export async function changePassword(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return { success: false as const, message: "Not authenticated" };

  // User yang cuma pernah login via Google belum pernah punya kata sandi,
  // jadi nggak ada "kata sandi saat ini" buat diverifikasi.
  const hasPassword = (user.identities ?? []).some((i) => i.provider === "email");

  const newPassword = String(formData.get("new_password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");
  const signOutOthers = formData.get("sign_out_others") === "on";

  if (newPassword.length < 6) {
    return { success: false as const, message: "Kata sandi baru minimal 6 karakter." };
  }
  if (newPassword !== confirmPassword) {
    return { success: false as const, message: "Konfirmasi kata sandi tidak cocok." };
  }

  if (hasPassword) {
    const currentPassword = String(formData.get("current_password") ?? "");
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (verifyError) {
      return { success: false as const, message: "Kata sandi saat ini salah." };
    }
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) {
    return { success: false as const, message: updateError.message };
  }

  if (signOutOthers) {
    await supabase.auth.signOut({ scope: "others" });
  }

  return { success: true as const };
}

export async function updateNotificationPrefs(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false as const, message: "Not authenticated" };

  const notifyReceipts = formData.get("notify_receipts") === "true";
  const notifyExpiry = formData.get("notify_expiry") === "true";

  const { error } = await supabase
    .from("profiles")
    .update({ notify_receipts: notifyReceipts, notify_expiry: notifyExpiry })
    .eq("id", user.id);

  if (error) {
    return { success: false as const, message: error.message };
  }

  revalidatePath("/settings");
  return { success: true as const };
}
