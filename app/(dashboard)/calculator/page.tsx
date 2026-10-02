import { LotCalculator } from "@/components/calculator/LotCalculator";
import { getCurrentUserTier, hasAccess } from "@/lib/tier";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { getT } from "@/lib/i18n/server";

export default async function CalculatorPage() {
  const { t } = await getT();
  const tier = await getCurrentUserTier();
  if (!hasAccess(tier, "MEMBERSHIP")) {
    return <AccessDenied requiredTier="MEMBERSHIP" />;
  }

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">Lot Calculator</h1>
        <p className="text-body-sm text-text-secondary">{t("Hitung ukuran lot berdasarkan manajemen risiko kamu.")}</p>
      </div>

      <LotCalculator />
    </main>
  );
}
