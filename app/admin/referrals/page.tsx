import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { dateLocale } from "@/lib/i18n/dictionary";
import { cx } from "@/lib/utils";

interface Row {
  id: string;
  referrer_id: string;
  referred_id: string;
  status: "PENDING" | "REWARDED" | "REJECTED" | "CAPPED";
  reward_days: number;
  note: string | null;
  created_at: string;
  rewarded_at: string | null;
}

const STATUS_LABEL: Record<Row["status"], string> = {
  PENDING: "Belum bergabung",
  REWARDED: "Hadiah diterima",
  REJECTED: "Tidak memenuhi syarat",
  CAPPED: "Batas hadiah tercapai",
};

export default async function AdminReferralsPage() {
  const { t, locale } = await getT();
  const supabase = await createClient();

  // RLS: admin boleh melihat semua referral dan semua profil.
  const { data } = await supabase
    .from("referrals")
    .select("id, referrer_id, referred_id, status, reward_days, note, created_at, rewarded_at")
    .order("created_at", { ascending: false })
    .limit(300);
  const rows = (data ?? []) as Row[];

  const ids = Array.from(new Set(rows.flatMap((r) => [r.referrer_id, r.referred_id])));
  const emails = new Map<string, string | null>();
  if (ids.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("id, email").in("id", ids);
    for (const p of profiles ?? []) emails.set(p.id as string, (p.email as string | null) ?? null);
  }

  const fmt = new Intl.DateTimeFormat(dateLocale(locale), { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
  const rewarded = rows.filter((r) => r.status === "REWARDED").length;

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">{t("Referral")}</h1>
        <p className="text-body-sm text-text-secondary">
          {t("{total} referral tercatat, {rewarded} sudah mendapat hadiah (300 terbaru).", { total: rows.length, rewarded })}
        </p>
      </div>

      <div className="card overflow-x-auto !p-0">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface text-left">
              {["Pengundang", "Diundang", "Tanggal daftar", "Status", "Catatan"].map((h) => (
                <th key={h} className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-secondary">
                  {t(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-body-sm text-text-muted">
                  {t("Belum ada referral.")}
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                <td className="px-4 py-3 text-body-sm text-text-primary">{emails.get(r.referrer_id) ?? r.referrer_id}</td>
                <td className="px-4 py-3 text-body-sm text-text-primary">{emails.get(r.referred_id) ?? r.referred_id}</td>
                <td className="px-4 py-3 text-body-sm text-text-secondary">{fmt.format(new Date(r.created_at))}</td>
                <td className={cx("px-4 py-3 text-body-sm font-semibold", r.status === "REWARDED" ? "text-success" : "text-text-secondary")}>
                  {t(STATUS_LABEL[r.status])}
                  {r.status === "REWARDED" && r.reward_days > 0 ? ` (+${r.reward_days} ${t("hari")})` : ""}
                </td>
                <td className="px-4 py-3 text-caption text-text-muted">{r.note ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
