import { LotCalculator } from "@/components/calculator/LotCalculator";
import { getCurrentUserTier, hasAccess } from "@/lib/tier";
import { AccessDenied } from "@/components/ui/AccessDenied";

export default async function CalculatorPage() {
  const tier = await getCurrentUserTier();
  if (!hasAccess(tier, "MEMBERSHIP")) {
    return <AccessDenied requiredTier="MEMBERSHIP" />;
  }

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">Lot Calculator</h1>
        <p className="text-body-sm text-text-secondary">Hitung ukuran lot berdasarkan manajemen risiko kamu.</p>
      </div>

      <LotCalculator />
    </main>
  );
}
