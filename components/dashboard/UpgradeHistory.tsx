import type { VipIbRequest } from "@/lib/types";
import { getT } from "@/lib/i18n/server";
import { dateLocale } from "@/lib/i18n/dictionary";

const statusLabel: Record<VipIbRequest["status"], string> = {
  PENDING: "Diproses",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
};

const statusClass: Record<VipIbRequest["status"], string> = {
  PENDING: "text-warning",
  APPROVED: "text-success",
  REJECTED: "text-error",
};

export async function UpgradeHistory({ requests }: { requests: VipIbRequest[] }) {
  const { t, locale } = await getT();
  return (
    <div className="card">
      <h2 className="mb-4 text-h3 text-text-primary">{t("Riwayat Pembelian")}</h2>
      {requests.length === 0 ? (
        <p className="text-body-sm text-text-muted">{t("Belum ada riwayat pengajuan upgrade.")}</p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {requests.map((r) => (
            <div key={r.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-body-sm font-medium text-text-primary">Deposit ${r.first_deposit} — {r.trading_account_id}</p>
                <p className="text-caption text-text-muted">
                  {new Date(r.created_at).toLocaleDateString(dateLocale(locale), { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
              <span className={`text-body-sm font-semibold ${statusClass[r.status]}`}>{t(statusLabel[r.status])}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
