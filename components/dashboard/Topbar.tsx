import { getT } from "@/lib/i18n/server";
import { dateLocale } from "@/lib/i18n/dictionary";
export async function Topbar({ userName }: { userName: string }) {
  const { t, locale } = await getT();
  const dateLabel = new Date().toLocaleDateString(dateLocale(locale), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="sticky top-0 z-10 flex h-topbar items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur">
      <h1 className="text-h3 text-text-primary">{t("Halo,")} {userName}</h1>
      <p className="hidden text-caption uppercase tracking-wide text-text-muted sm:block">{dateLabel}</p>
    </header>
  );
}
