"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const fullName = String(formData.get("full_name") ?? "");

  await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", user.id);

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}
