import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { notifyUser } from "@/lib/notifications";
import { getUserT } from "@/lib/i18n/server";
import { logAudit } from "@/lib/audit";
import {
  REFERRAL_ACCOUNT_MAX_AGE_DAYS,
  REFERRAL_CODE_ALPHABET,
  REFERRAL_CODE_LENGTH,
  REFERRAL_CODE_PATTERN,
  REFERRAL_COOKIE,
  REFERRAL_MAX_REWARDS_PER_REFERRER,
  REFERRAL_REWARD_DAYS,
} from "@/lib/referral-config";

const DAY_MS = 24 * 60 * 60 * 1000;

function randomCode(): string {
  const bytes = new Uint8Array(REFERRAL_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => REFERRAL_CODE_ALPHABET[b % REFERRAL_CODE_ALPHABET.length]).join("");
}

/** Pastikan user punya kode referral; buat kalau belum (service client: kolom ini dilindungi trigger). */
export async function ensureReferralCode(service: SupabaseClient, userId: string): Promise<string | null> {
  const { data: profile } = await service.from("profiles").select("referral_code").eq("id", userId).single();
  if (profile?.referral_code) return profile.referral_code as string;

  for (let attempt = 0; attempt < 6; attempt++) {
    const code = randomCode();
    const { data, error } = await service
      .from("profiles")
      .update({ referral_code: code })
      .eq("id", userId)
      .is("referral_code", null)
      .select("referral_code")
      .maybeSingle();
    if (!error && data?.referral_code) return data.referral_code as string;
    if (!error && !data) {
      // sudah terisi oleh request lain
      const { data: again } = await service.from("profiles").select("referral_code").eq("id", userId).single();
      return (again?.referral_code as string | null) ?? null;
    }
    // error biasanya bentrok unique -> coba kode lain
  }
  return null;
}

/**
 * Hubungkan akun BARU ke pengundang dari cookie link undangan (/r/KODE).
 * Aman dipanggil berulang: tidak melakukan apa pun kalau tidak ada cookie, bukan akun baru,
 * sudah punya pengundang, atau kodenya milik sendiri. Tidak pernah melempar error.
 */
export async function attachReferralFromCookie(user: { id: string; created_at?: string | null }): Promise<void> {
  try {
    const store = await cookies();
    const raw = store.get(REFERRAL_COOKIE)?.value ?? "";
    if (!raw) return;

    // Hapus cookie apa pun hasilnya, supaya tidak dicoba terus-menerus.
    store.set(REFERRAL_COOKIE, "", { path: "/", maxAge: 0 });

    const code = raw.toUpperCase();
    if (!REFERRAL_CODE_PATTERN.test(code)) return;

    const createdAt = user.created_at ? new Date(user.created_at).getTime() : 0;
    if (!createdAt || Date.now() - createdAt > REFERRAL_ACCOUNT_MAX_AGE_DAYS * DAY_MS) return;

    const service = createServiceClient();
    const { data: referrer } = await service
      .from("profiles")
      .select("id, is_suspended")
      .eq("referral_code", code)
      .maybeSingle();
    if (!referrer || referrer.id === user.id || referrer.is_suspended) return;

    const { data: me } = await service.from("profiles").select("referred_by").eq("id", user.id).single();
    if (!me || me.referred_by) return;

    // referrals.referred_id unik: satu akun hanya bisa punya satu pengundang.
    const { error } = await service.from("referrals").insert({ referrer_id: referrer.id, referred_id: user.id });
    if (error) return;
    await service.from("profiles").update({ referred_by: referrer.id }).eq("id", user.id);
  } catch (err) {
    console.error("[referral] attach gagal:", err);
  }
}

/**
 * Beri hadiah ke pengundang saat orang yang diundang BERGABUNG (bayar VIP/Membership atau
 * pengajuan VIP IB disetujui). Hanya sekali per orang yang diundang (klaim atomik).
 * Tidak pernah melempar error supaya tidak mengganggu proses pembayaran.
 */
export async function grantReferralReward(referredUserId: string): Promise<void> {
  try {
    const service = createServiceClient();

    const { data: pending } = await service
      .from("referrals")
      .select("id, referrer_id")
      .eq("referred_id", referredUserId)
      .eq("status", "PENDING")
      .maybeSingle();
    if (!pending) return;

    const referrerId = pending.referrer_id as string;
    const system = { id: null, email: "system (referral)" };

    // Batas hadiah per pengundang
    const { count } = await service
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("referrer_id", referrerId)
      .eq("status", "REWARDED");
    if ((count ?? 0) >= REFERRAL_MAX_REWARDS_PER_REFERRER) {
      await service
        .from("referrals")
        .update({ status: "CAPPED", note: "Batas hadiah per pengundang tercapai" })
        .eq("id", pending.id)
        .eq("status", "PENDING");
      return;
    }

    // Klaim atomik: hanya satu proses yang boleh memberi hadiah untuk referral ini.
    const { data: claimed } = await service
      .from("referrals")
      .update({ status: "REWARDED", reward_days: REFERRAL_REWARD_DAYS, rewarded_at: new Date().toISOString() })
      .eq("id", pending.id)
      .eq("status", "PENDING")
      .select("id")
      .maybeSingle();
    if (!claimed) return;

    const { data: referrer } = await service
      .from("profiles")
      .select("email, tier, vip_expires_at, is_suspended")
      .eq("id", referrerId)
      .single();

    const revert = async (note: string, status: "PENDING" | "REJECTED") =>
      service.from("referrals").update({ status, reward_days: 0, rewarded_at: null, note }).eq("id", pending.id);

    if (!referrer || referrer.is_suspended) {
      await revert("Pengundang tidak valid / disuspend", "REJECTED");
      return;
    }

    // Hitung hadiah: perpanjang masa aktif; kalau belum punya akses aktif, beri VIP selama N hari.
    const now = Date.now();
    const expiry = referrer.vip_expires_at ? new Date(referrer.vip_expires_at).getTime() : null;
    const paidTier = referrer.tier === "VIP" || referrer.tier === "MEMBERSHIP";
    const active = paidTier && (expiry === null || expiry > now);
    const addMs = REFERRAL_REWARD_DAYS * DAY_MS;

    let update: { tier?: string; vip_expires_at: string | null } | null;
    if (active && expiry === null) {
      update = null; // sudah tanpa batas waktu: tidak ada yang bisa ditambah
    } else if (active && expiry !== null) {
      update = { vip_expires_at: new Date(expiry + addMs).toISOString() };
    } else {
      update = { tier: "VIP", vip_expires_at: new Date(now + addMs).toISOString() };
    }

    if (update) {
      const { error } = await service.from("profiles").update(update).eq("id", referrerId);
      if (error) {
        await revert(`Gagal memberi hadiah: ${error.message}`, "PENDING"); // coba lagi di kesempatan berikut
        return;
      }
    } else {
      await service.from("referrals").update({ reward_days: 0, note: "Pengundang sudah tanpa batas waktu" }).eq("id", pending.id);
    }

    const { t: tu } = await getUserT(service, referrerId);
    await notifyUser({
      userId: referrerId,
      email: referrer.email ?? null,
      type: "TIER_UPGRADE",
      title: tu("🎁 Hadiah referral untukmu!"),
      message: update
        ? tu("Temanmu yang kamu undang sudah bergabung. Kamu mendapat tambahan {days} hari akses. Terima kasih!", {
            days: REFERRAL_REWARD_DAYS,
          })
        : tu("Temanmu yang kamu undang sudah bergabung. Terima kasih sudah mengajak!"),
      client: service,
    });

    await logAudit(service, {
      actor: system,
      action: "REFERRAL_REWARDED",
      targetUserId: referrerId,
      targetId: pending.id,
      details: {
        referred_user_id: referredUserId,
        reward_days: update ? REFERRAL_REWARD_DAYS : 0,
        from_tier: referrer.tier,
        from_expires_at: referrer.vip_expires_at,
        to_tier: update?.tier ?? referrer.tier,
        to_expires_at: update ? update.vip_expires_at : referrer.vip_expires_at,
      },
    });
  } catch (err) {
    console.error("[referral] hadiah gagal:", err);
  }
}

export function maskEmail(email: string | null | undefined): string {
  if (!email) return "—";
  const [name, domain] = email.split("@");
  if (!domain) return "—";
  const visible = name.slice(0, Math.min(2, name.length));
  return `${visible}${"*".repeat(Math.max(2, name.length - visible.length))}@${domain}`;
}
