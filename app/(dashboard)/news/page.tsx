import { EconomicCalendarTable } from "@/components/news/EconomicCalendarTable";
import { MyfxbookCalendarWidget } from "@/components/news/MyfxbookCalendarWidget";
import { NewsCalendarTabs } from "@/components/news/NewsCalendarTabs";
import { getEconomicCalendarRange } from "@/lib/economic-calendar";
import { getCurrentUserTier, hasAccess } from "@/lib/tier";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { applyManualActuals, getManualActuals } from "@/lib/calendar-actuals";

export default async function NewsPage() {
  const { t } = await getT();
  const tier = await getCurrentUserTier();
  if (!hasAccess(tier, "MEMBERSHIP")) {
    return <AccessDenied requiredTier="MEMBERSHIP" />;
  }

  const supabase = await createClient();
  const [feedEvents, manualActuals] = await Promise.all([getEconomicCalendarRange(), getManualActuals(supabase)]);
  const events = applyManualActuals(feedEvents, manualActuals);

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">Economic Calendar &amp; Market News</h1>
        <p className="text-body-sm text-text-secondary">
          {t("Kalender ekonomi lengkap dengan hasil rilis (Actual). Tab Jadwal menampilkan waktu dalam WIB.")}
        </p>
      </div>

      <NewsCalendarTabs
        widget={
          <>
            <MyfxbookCalendarWidget title={t("Kalender Ekonomi")} />
            <p className="mt-3 text-caption text-text-muted">
              {t("Kalender oleh Myfxbook. Zona waktu bisa diganti lewat menu jam di bagian atas kalender (bawaan GMT).")}
            </p>
          </>
        }
        schedule={<EconomicCalendarTable events={events} />}
      />
    </main>
  );
}
