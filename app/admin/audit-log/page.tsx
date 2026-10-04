import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { dateLocale } from "@/lib/i18n/dictionary";

const ACTION_LABEL: Record<string, string> = {
  TIER_CHANGED: "Tier diubah",
  USER_SUSPENDED: "User disuspend",
  USER_UNSUSPENDED: "Suspend dicabut",
  USDT_APPROVED: "Pembayaran USDT disetujui",
  USDT_REJECTED: "Pembayaran USDT ditolak",
  VIP_REQUEST_APPROVED: "Pengajuan VIP disetujui",
  VIP_REQUEST_REJECTED: "Pengajuan VIP ditolak",
  PAYMENT_AUTO_COMPLETED: "Pembayaran otomatis selesai",
  SIGNAL_CREATED: "Sinyal dibuat",
  SIGNAL_STATUS_CHANGED: "Status sinyal diubah",
  SIGNAL_UPDATE_POSTED: "Update sinyal diposting",
  SIGNAL_DELETED: "Sinyal dihapus",
  ANNOUNCEMENT_SENT: "Pengumuman dikirim",
  CALENDAR_ACTUAL_SET: "Actual berita diisi",
  REFERRAL_REWARDED: "Hadiah referral diberikan",
  PROMO_CREATED: "Kode promo dibuat",
  PROMO_TOGGLED: "Kode promo diaktifkan/dinonaktifkan",
};

interface AuditRow {
  id: string;
  actor_email: string | null;
  action: string;
  target_user_id: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

function summarize(details: Record<string, unknown> | null): string {
  if (!details) return "";
  return Object.entries(details)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
    .join(" · ");
}

export default async function AdminAuditLogPage() {
  const { t, locale } = await getT();
  const supabase = await createClient();

  const { data } = await supabase
    .from("audit_logs")
    .select("id, actor_email, action, target_user_id, target_id, details, created_at")
    .order("created_at", { ascending: false })
    .limit(300);
  const rows = (data ?? []) as AuditRow[];

  const fmt = new Intl.DateTimeFormat(dateLocale(locale), {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  });

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">{t("Audit Log")}</h1>
        <p className="text-body-sm text-text-secondary">
          {t("Catatan aksi admin dan sistem (300 terbaru). Catatan tidak bisa diubah atau dihapus dari aplikasi.")}
        </p>
      </div>

      <div className="card overflow-x-auto !p-0">
        <table className="w-full min-w-[900px] border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface text-left">
              {["Waktu (WIB)", "Oleh", "Aksi", "Target", "Detail"].map((h) => (
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
                  {t("Belum ada catatan.")}
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const targetEmail = typeof r.details?.target_email === "string" ? r.details.target_email : null;
              return (
                <tr key={r.id} className="border-b border-border align-top last:border-0 hover:bg-surface-hover">
                  <td className="whitespace-nowrap px-4 py-3 text-body-sm text-text-secondary">
                    {fmt.format(new Date(r.created_at))}
                  </td>
                  <td className="px-4 py-3 text-body-sm text-text-primary">{r.actor_email ?? "—"}</td>
                  <td className="px-4 py-3 text-body-sm font-semibold text-text-primary">
                    {t(ACTION_LABEL[r.action] ?? r.action)}
                  </td>
                  <td className="px-4 py-3 text-body-sm text-text-secondary">
                    {targetEmail ?? r.target_user_id ?? r.target_id ?? "—"}
                  </td>
                  <td className="max-w-[420px] break-words px-4 py-3 text-caption text-text-muted">
                    {summarize(r.details)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
