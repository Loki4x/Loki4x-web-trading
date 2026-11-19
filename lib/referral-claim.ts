import { claimReferralDays } from "@/lib/referral";
import { REFERRAL_CLAIM_THRESHOLD_DAYS } from "@/lib/referral-config";
import { rateLimit } from "@/lib/rate-limit";

type T = (key: string, vars?: Record<string, string | number>) => string;

/** Klaim saldo hari referral jadi VIP + pesan hasil. Dipakai server action web dan API aplikasi. */
export async function claimReferralWithMessage(userId: string, t: T): Promise<{ ok: boolean; message: string }> {
  if (!(await rateLimit(`referral-claim:${userId}`, 5, 600))) {
    return { ok: false, message: t("Terlalu banyak percobaan. Coba lagi dalam beberapa menit.") };
  }
  const result = await claimReferralDays(userId);
  if (result.ok) return { ok: true, message: t("Berhasil! {days} hari VIP sudah aktif di akunmu.", { days: result.days }) };
  switch (result.reason) {
    case "NOT_ENOUGH":
      return {
        ok: false,
        message: t("Saldo belum cukup: {balance}/{threshold} hari.", { balance: result.balance ?? 0, threshold: REFERRAL_CLAIM_THRESHOLD_DAYS }),
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
