import { EconomicCalendarTable } from "@/components/news/EconomicCalendarTable";
import { getEconomicCalendarRange } from "@/lib/economic-calendar";
import { getCurrentUserTier, hasAccess } from "@/lib/tier";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { getT } from "@/lib/i18n/server";

export default async function NewsPage() {
  const { t } = await getT();
  const tier = await getCurrentUserTier();
  if (!hasAccess(tier, "MEMBERSHIP")) {
    return <AccessDenied requiredTier="MEMBERSHIP" />;
  }

  const events = await getEconomicCalendarRange();

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">Economic Calendar &amp; Market News</h1>
        <p className="text-body-sm text-text-secondary">
          {t("Data dari Forex Factory, waktu ditampilkan dalam WIB. Update otomatis setiap beberapa menit.")}
        </p>
      </div>

      <EconomicCalendarTable events={events} />
    </main>
  );
}
