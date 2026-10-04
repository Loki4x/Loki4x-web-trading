import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { claimBlockReason, ensureReferralCode, maskEmail } from "@/lib/referral";
import {
  REFERRAL_CLAIM_THRESHOLD_DAYS,
  REFERRAL_MAX_REWARDS_PER_REFERRER,
  REFERRAL_REWARD_DAYS,
} from "@/lib/referral-config";
import { ReferralPanel } from "@/components/referral/ReferralPanel";
import { ClaimCard } from "@/components/referral/ClaimCard";
import { getT } from "@/lib/i18n/server";
import { dateLocale } from "@/lib/i18n/dictionary";
import { cx } from "@/lib/utils";

interface ReferralRow {
  id: string;
  referred_id: string;
  status: "PENDING" | "REWARDED" | "REJECTED" | "CAPPED";
  reward_days: number;
  claimed_at: string | null;
  created_at: string;
}

const STATUS_LABEL: Record<ReferralRow["status"], string> = {
  PENDING: "Belum bergabung",
  REWARDED: "Hari terkumpul",
  REJECTED: "Tidak memenuhi syarat",
  CAPPED: "Batas hadiah tercapai",
};

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://4xcomunity.my.id").replace(/\/$/, "");

export default async function ReferralPage() {
  const { t, locale } = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const service = createServiceClient();
  const code = await ensureReferralCode(service, user.id);

  // RLS: user hanya bisa membaca referral miliknya sendiri.
  const { data } = await supabase
    .from("referrals")
    .select("id, referred_id, status, reward_days, claimed_at, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as ReferralRow[];

  // Email orang yang diundang ditampilkan SAMAR (mis. ab***@gmail.com).
  const emails = new Map<string, string | null>();
  if (rows.length > 0) {
    const { data: profiles } = await service.from("profiles").select("id, email").in("id", rows.map((r) => r.referred_id));
    for (const p of profiles ?? []) emails.set(p.id as string, (p.email as string | null) ?? null);
  }

  const rewarded = rows.filter((r) => r.status === "REWARDED");
  const balance = rewarded.filter((r) => !r.claimed_at).reduce((sum, r) => sum + r.reward_days, 0);
  const claimedDays = rewarded.filter((r) => r.claimed_at).reduce((sum, r) => sum + r.reward_days, 0);

  const { data: me } = await supabase.from("profiles").select("tier, vip_expires_at").eq("id", user.id).single();
  const blocked = me ? claimBlockReason(me) : null;
  const fmt = new Intl.DateTimeFormat(dateLocale(locale), { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">{t("Referral")}</h1>
        <p className="text-body-sm text-text-secondary">
          {t("Ajak teman, dapat hari VIP. Tiap teman yang bergabung sebagai VIP atau Membership memberi +{days} hari VIP, dan bisa diklaim setelah terkumpul {threshold} hari.", {
            days: REFERRAL_REWARD_DAYS,
            threshold: REFERRAL_CLAIM_THRESHOLD_DAYS,
          })}
        </p>
      </div>

      {code ? (
        <ReferralPanel link={`${SITE_URL}/r/${code}`} code={code} />
      ) : (
        <div className="card text-body-sm text-error">{t("Gagal membuat kode referral, coba muat ulang halaman.")}</div>
      )}

      <ClaimCard balance={balance} threshold={REFERRAL_CLAIM_THRESHOLD_DAYS} blocked={blocked} />

      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="card !p-4">
          <p className="text-caption text-text-secondary">{t("Teman diundang")}</p>
          <p className="text-h3 text-text-primary">{rows.length}</p>
        </div>
        <div className="card !p-4">
          <p className="text-caption text-text-secondary">{t("Sudah bergabung")}</p>
          <p className="text-h3 text-success">{rewarded.length}</p>
        </div>
        <div className="card !p-4">
          <p className="text-caption text-text-secondary">{t("Hari sudah diklaim")}</p>
          <p className="text-h3 text-text-primary">+{claimedDays}</p>
        </div>
      </div>

      <div className="card mt-4 text-body-sm text-text-secondary">
        <p className="font-semibold text-text-primary">{t("Cara kerjanya")}</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>{t("Bagikan link undanganmu ke teman.")}</li>
          <li>{t("Temanmu mendaftar lewat link itu (akun baru).")}</li>
          <li>
            {t("Saat temanmu berlangganan VIP/Membership atau pengajuan VIP IB-nya disetujui, saldomu bertambah +{days} hari VIP.", {
              days: REFERRAL_REWARD_DAYS,
            })}
          </li>
          <li>
            {t("Setelah saldo mencapai {threshold} hari, klik Klaim: seluruh saldo ditambahkan sebagai VIP di akunmu.", {
              threshold: REFERRAL_CLAIM_THRESHOLD_DAYS,
            })}
          </li>
        </ol>
        <p className="mt-3 text-caption text-text-muted">
          {t("Maksimal {max} hadiah per akun. Hadiah hanya untuk teman yang belum punya akun sebelumnya.", {
            max: REFERRAL_MAX_REWARDS_PER_REFERRER,
          })}
        </p>
      </div>

      <div className="card mt-4 overflow-x-auto !p-0">
        <table className="w-full min-w-[480px] border-collapse">
          <thead>
            <tr className="border-b border-border text-left">
              {["Teman", "Tanggal daftar", "Status"].map((h) => (
                <th key={h} className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-secondary">
                  {t(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-body-sm text-text-muted">
                  {t("Belum ada teman yang mendaftar lewat link kamu.")}
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-body-sm text-text-primary">{maskEmail(emails.get(r.referred_id))}</td>
                <td className="px-4 py-3 text-body-sm text-text-secondary">{fmt.format(new Date(r.created_at))}</td>
                <td className={cx("px-4 py-3 text-body-sm font-semibold", r.status === "REWARDED" ? "text-success" : "text-text-secondary")}>
                  {r.status === "REWARDED" && r.claimed_at ? t("Sudah diklaim") : t(STATUS_LABEL[r.status])}
                  {r.status === "REWARDED" && r.reward_days > 0 ? ` (+${r.reward_days} ${t("hari")})` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
