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
  REFERRAL_CLAIM_THRESHOLD_DAYS,
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

/** Jumlah hari referral yang sudah dapat hadiah tapi BELUM diklaim (saldo pengundang). */
export async function getReferralBalance(service: SupabaseClient, referrerId: string): Promise<number> {
  const { data } = await service
    .from("referrals")
    .select("reward_days")
    .eq("referrer_id", referrerId)
    .eq("status", "REWARDED")
    .is("claimed_at", null);
  return (data ?? []).reduce((sum, r) => sum + Number(r.reward_days ?? 0), 0);
}

export type ClaimBlockReason = "MEMBERSHIP" | "PERMANENT_VIP";

/**
 * Hadiah referral berupa hari VIP. Tidak bisa diklaim kalau:
 * - akun sedang Membership aktif (sudah lebih tinggi dari VIP), atau
 * - akun sudah VIP tanpa batas waktu (tidak ada yang bisa ditambah).
 * Saldo tetap tersimpan dan bisa diklaim nanti.
 */
export function claimBlockReason(
  profile: { tier: string | null; vip_expires_at: string | null },
  now = Date.now()
): ClaimBlockReason | null {
  const expiry = profile.vip_expires_at ? new Date(profile.vip_expires_at).getTime() : null;
  const active = (profile.tier === "VIP" || profile.tier === "MEMBERSHIP") && (expiry === null || expiry > now);
  if (!active) return null;
  if (profile.tier === "MEMBERSHIP") return "MEMBERSHIP";
  if (expiry === null) return "PERMANENT_VIP";
  return null;
}

/**
 * Catat hadiah saat orang yang diundang BERGABUNG (bayar VIP atau Membership, atau pengajuan
 * VIP IB disetujui): +REFERRAL_REWARD_DAYS hari masuk ke SALDO pengundang. Hanya sekali per
 * orang yang diundang (klaim atomik). Tidak pernah melempar error supaya tidak mengganggu
 * proses pembayaran.
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

    const { data: referrer } = await service
      .from("profiles")
      .select("email, is_suspended")
      .eq("id", referrerId)
      .single();
    if (!referrer || referrer.is_suspended) {
      await service
        .from("referrals")
        .update({ status: "REJECTED", note: "Pengundang tidak valid / disuspend" })
        .eq("id", pending.id)
        .eq("status", "PENDING");
      return;
    }

    // Klaim atomik: hanya satu proses yang boleh memberi hadiah untuk referral ini.
    const { data: claimed } = await service
      .from("referrals")
      .update({
        status: "REWARDED",
        reward_days: REFERRAL_REWARD_DAYS,
        rewarded_at: new Date().toISOString(),
        claimed_at: null,
      })
      .eq("id", pending.id)
      .eq("status", "PENDING")
      .select("id")
      .maybeSingle();
    if (!claimed) return;

    const balance = await getReferralBalance(service, referrerId);

    const { t: tu } = await getUserT(service, referrerId);
    await notifyUser({
      userId: referrerId,
      email: referrer.email ?? null,
      type: "ANNOUNCEMENT",
      title: tu("🎁 Hadiah referral untukmu!"),
      message:
        balance >= REFERRAL_CLAIM_THRESHOLD_DAYS
          ? tu("Temanmu bergabung! +{days} hari VIP terkumpul. Saldo kamu {balance} hari dan sudah bisa diklaim di halaman Referral.", {
              days: REFERRAL_REWARD_DAYS,
              balance,
            })
          : tu("Temanmu bergabung! +{days} hari VIP terkumpul ({balance}/{threshold} hari untuk bisa diklaim).", {
              days: REFERRAL_REWARD_DAYS,
              balance,
              threshold: REFERRAL_CLAIM_THRESHOLD_DAYS,
            }),
      client: service,
    });

    await logAudit(service, {
      actor: system,
      action: "REFERRAL_REWARDED",
      targetUserId: referrerId,
      targetId: pending.id,
      details: { referred_user_id: referredUserId, reward_days: REFERRAL_REWARD_DAYS, balance_after: balance },
    });
  } catch (err) {
    console.error("[referral] hadiah gagal:", err);
  }
}

export type ClaimResult =
  | { ok: true; days: number; expiresAt: string }
  | { ok: false; reason: "NOT_ENOUGH" | "MEMBERSHIP" | "PERMANENT_VIP" | "SUSPENDED" | "ERROR"; balance?: number };

/**
 * Klaim saldo hari referral menjadi VIP. Syarat: saldo >= REFERRAL_CLAIM_THRESHOLD_DAYS.
 * Seluruh saldo ditambahkan sebagai VIP (akun FREE/kedaluwarsa jadi VIP; VIP aktif diperpanjang).
 * Pengklaiman bersifat atomik: baris referral "diambil" dulu, jadi klik ganda tidak menggandakan hari.
 */
export async function claimReferralDays(userId: string): Promise<ClaimResult> {
  const service = createServiceClient();
  const claimedAt = new Date().toISOString();

  try {
    const readProfile = () =>
      service.from("profiles").select("email, tier, vip_expires_at, is_suspended").eq("id", userId).single();

    const { data: before } = await readProfile();
    if (!before) return { ok: false, reason: "ERROR" };
    if (before.is_suspended) return { ok: false, reason: "SUSPENDED" };
    const blocked = claimBlockReason(before);
    if (blocked) return { ok: false, reason: blocked };

    const { data: open } = await service
      .from("referrals")
      .select("id, reward_days")
      .eq("referrer_id", userId)
      .eq("status", "REWARDED")
      .is("claimed_at", null);
    const balance = (open ?? []).reduce((sum, r) => sum + Number(r.reward_days ?? 0), 0);
    if (balance < REFERRAL_CLAIM_THRESHOLD_DAYS) return { ok: false, reason: "NOT_ENOUGH", balance };

    // "Ambil" baris saldo secara atomik: proses lain tidak bisa mengambil baris yang sama.
    const ids = (open ?? []).map((r) => r.id as string);
    const { data: taken } = await service
      .from("referrals")
      .update({ claimed_at: claimedAt })
      .eq("referrer_id", userId)
      .eq("status", "REWARDED")
      .is("claimed_at", null)
      .in("id", ids)
      .select("id, reward_days");
    const takenIds = (taken ?? []).map((r) => r.id as string);
    const days = (taken ?? []).reduce((sum, r) => sum + Number(r.reward_days ?? 0), 0);

    const revert = () =>
      takenIds.length > 0 ? service.from("referrals").update({ claimed_at: null }).in("id", takenIds) : Promise.resolve();

    if (days < REFERRAL_CLAIM_THRESHOLD_DAYS) {
      await revert(); // klaim lain menyela
      return { ok: false, reason: "NOT_ENOUGH", balance };
    }

    // Baca ulang profil setelah mengambil saldo, lalu hitung VIP baru.
    const { data: fresh } = await readProfile();
    if (!fresh || claimBlockReason(fresh)) {
      await revert();
      return { ok: false, reason: fresh ? (claimBlockReason(fresh) as ClaimBlockReason) : "ERROR" };
    }

    const now = Date.now();
    const expiry = fresh.vip_expires_at ? new Date(fresh.vip_expires_at).getTime() : null;
    const activeVip = fresh.tier === "VIP" && expiry !== null && expiry > now;
    const base = activeVip && expiry !== null ? expiry : now;
    const newExpiry = new Date(base + days * DAY_MS).toISOString();

    const { error } = await service.from("profiles").update({ tier: "VIP", vip_expires_at: newExpiry }).eq("id", userId);
    if (error) {
      await revert();
      return { ok: false, reason: "ERROR" };
    }

    await logAudit(service, {
      actor: { id: userId, email: fresh.email ?? null },
      action: "REFERRAL_CLAIMED",
      targetUserId: userId,
      details: {
        days,
        referral_ids: takenIds,
        from_tier: fresh.tier,
        from_expires_at: fresh.vip_expires_at,
        to_tier: "VIP",
        to_expires_at: newExpiry,
      },
    });

    return { ok: true, days, expiresAt: newExpiry };
  } catch (err) {
    console.error("[referral] klaim gagal:", err);
    return { ok: false, reason: "ERROR" };
  }
}

export function maskEmail(email: string | null | undefined): string {
  if (!email) return "—";
  const [name, domain] = email.split("@");
  if (!domain) return "—";
  const visible = name.slice(0, Math.min(2, name.length));
  return `${visible}${"*".repeat(Math.max(2, name.length - visible.length))}@${domain}`;
}
