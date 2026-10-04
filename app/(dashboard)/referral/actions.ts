"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { claimReferralDays } from "@/lib/referral";
import { REFERRAL_CLAIM_THRESHOLD_DAYS } from "@/lib/referral-config";
import { rateLimit } from "@/lib/rate-limit";
import { getT } from "@/lib/i18n/server";

export interface ClaimActionResult {
  ok: boolean;
  message: string;
}

/** Klaim saldo hari referral menjadi VIP. Semua aturan dicek ulang di server. */
export async function claimReferralReward(): Promise<ClaimActionResult> {
  const { t } = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  if (!(await rateLimit(`referral-claim:${user.id}`, 5, 600))) {
    return { ok: false, message: t("Terlalu banyak percobaan. Coba lagi dalam beberapa menit.") };
  }

  const result = await claimReferralDays(user.id);

  if (result.ok) {
    revalidatePath("/referral");
    revalidatePath("/dashboard");
    return { ok: true, message: t("Berhasil! {days} hari VIP sudah aktif di akunmu.", { days: result.days }) };
  }

  switch (result.reason) {
    case "NOT_ENOUGH":
      return {
        ok: false,
        message: t("Saldo belum cukup: {balance}/{threshold} hari.", {
          balance: result.balance ?? 0,
          threshold: REFERRAL_CLAIM_THRESHOLD_DAYS,
        }),
      };
    case "MEMBERSHIP":
      return {
        ok: false,
        message: t("Kamu sedang Membership, jadi hadiah VIP belum bisa diklaim. Saldo tetap aman dan bisa diklaim saat akunmu bukan Membership."),
      };
    case "PERMANENT_VIP":
      return { ok: false, message: t("VIP kamu sudah tanpa batas waktu, jadi belum ada yang bisa ditambah. Saldo tetap tersimpan.") };
    default:
      return { ok: false, message: t("Terjadi kesalahan.") };
  }
}
