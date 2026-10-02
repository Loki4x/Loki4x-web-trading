import { getCotSnapshot } from "@/lib/cot";
import { CotDashboardClient } from "@/components/cot/CotDashboardClient";
import { getCurrentUserTier, hasAccess } from "@/lib/tier";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { getT } from "@/lib/i18n/server";

export default async function CotPage() {
  const { t } = await getT();
  const tier = await getCurrentUserTier();
  if (!hasAccess(tier, "VIP")) {
    return <AccessDenied requiredTier="VIP" />;
  }

  const { rows, reportDate } = await getCotSnapshot();

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">Institutional Positioning (COT)</h1>
        <p className="text-body-sm text-text-secondary">
          {t("Data resmi CFTC (Commitment of Traders) — dipakai juga oleh CME Group.")}
        </p>
      </div>

      <CotDashboardClient rows={rows} reportDate={reportDate} />
    </main>
  );
}
