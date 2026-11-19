"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { claimReferralWithMessage } from "@/lib/referral-claim";

export interface ClaimActionResult {
  ok: boolean;
  message: string;
}

/** Klaim saldo hari referral menjadi VIP. Semua aturan dicek ulang di server (lib/referral-claim.ts). */
export async function claimReferralReward(): Promise<ClaimActionResult> {
  const { t } = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const res = await claimReferralWithMessage(user.id, t);
  if (res.ok) {
    revalidatePath("/referral");
    revalidatePath("/dashboard");
  }
  return res;
}
