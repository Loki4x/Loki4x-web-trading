import { Reveal } from "@/components/ui/Reveal";
import { Accent, SectionHeading } from "@/components/landing/SectionHeading";
import { CountUp } from "@/components/ui/CountUp";
import { PortfolioGrowthChart } from "@/components/signals/PortfolioGrowthChart";
import { getPublicTrackRecord } from "@/lib/public-track-record";
import { LocaleProvider } from "@/lib/i18n/client";
import { dateLocale, translate, type TKey } from "@/lib/i18n/dictionary";
import { cx } from "@/lib/utils";

function Stat({
  label,
  value,
  tone,
  hint,
  delay = 0,
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg";
  hint?: string;
  delay?: number;
}) {
  return (
    <Reveal delay={delay} className="h-full">
      <div className="card h-full !p-4">
        <p className="text-caption text-text-secondary">{label}</p>
        <p className={cx("text-h3", tone === "pos" && "text-success", tone === "neg" && "text-error")}>
          <CountUp value={value} />
        </p>
        {hint && <p className="text-caption text-text-muted">{hint}</p>}
      </div>
    </Reveal>
  );
}

const signed = (n: number, digits = 1) => `${n > 0 ? "+" : ""}${n.toFixed(digits)}`;

/** Track record publik, ditampilkan langsung di landing page (di bawah Hero). */
export async function TrackRecord() {
  // Landing page berbahasa Inggris, jadi section ini dipaksa Inggris (tidak ikut cookie bahasa).
  const locale = "en" as const;
  const t = (key: TKey, vars?: Record<string, string | number>) => translate(locale, key, vars);

  let record: Awaited<ReturnType<typeof getPublicTrackRecord>> | null = null;
  try {
    record = await getPublicTrackRecord();
  } catch (err) {
    console.error("[track-record]", err);
  }

  const monthLabel = new Intl.DateTimeFormat(dateLocale(locale), { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <section id="track-record" className="scroll-mt-24 border-t border-border py-20">
      <div className="mx-auto max-w-content px-6">
        <SectionHeading
          badge="Track Record"
          description={t("Ringkasan performa semua sinyal yang sudah ditutup. Angka dihitung otomatis dari data sinyal kami.")}
        >
          Every Signal, <Accent>Fully Transparent</Accent>
        </SectionHeading>

        <div className="mt-14">
            {!record || record.closedCount === 0 ? (
              <div className="card text-center text-body-sm text-text-muted">{t("Data track record belum tersedia.")}</div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                  <Stat delay={0}
                    label={t("signals.totalR")}
                    value={`${signed(record.stats.totalR)}R`}
                    tone={record.stats.totalR >= 0 ? "pos" : "neg"}
                    hint={`${t("signals.rTrades", { count: record.stats.rTradeCount })} · ${t("signals.simGrowth")} ${signed(record.stats.totalGrowthPercent)}%`}
                  />
                  <Stat delay={90}
                    label={t("signals.winRate")}
                    value={`${record.stats.winRate.toFixed(0)}%`}
                    hint={t("signals.profitLoss", { wins: record.stats.wins, losses: record.stats.losses })}
                  />
                  <Stat delay={180}
                    label={t("signals.maxDrawdown")}
                    value={`${record.stats.maxDrawdownPercent.toFixed(1)}%`}
                    tone="neg"
                    hint={t("signals.maxDrawdownDesc")}
                  />
                  <Stat delay={270}
                    label={t("signals.pipsEarned")}
                    value={`${signed(record.stats.totalPips)} pips`}
                    tone={record.stats.totalPips >= 0 ? "pos" : "neg"}
                    hint={t("signals.pipsEarnedDesc")}
                  />
                  <Stat delay={360} label={t("Total sinyal ditutup")} value={String(record.closedCount)} />
                </div>

                <Reveal className="mt-6" from="zoom">
                  <LocaleProvider locale={locale}>
                    <PortfolioGrowthChart points={record.growth} />
                  </LocaleProvider>
                </Reveal>

                {record.monthly.length > 0 && (
                  <Reveal className="mt-6">
                  <div className="card overflow-x-auto !p-0">
                    <div className="px-5 pt-5">
                      <h2 className="text-h3 text-text-primary">{t("Performa per Bulan")}</h2>
                    </div>
                    <table className="mt-3 w-full min-w-[320px] border-collapse">
                      <thead>
                        <tr className="border-b border-border text-left">
                          <th className="px-5 py-3 text-caption font-semibold uppercase tracking-wide text-text-secondary">
                            {t("Bulan")}
                          </th>
                          <th className="px-5 py-3 text-right text-caption font-semibold uppercase tracking-wide text-text-secondary">
                            {t("signals.col.result")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...record.monthly].reverse().map((m) => (
                          <tr key={m.month} className="border-b border-border last:border-0">
                            <td className="px-5 py-3 text-body-sm text-text-primary">
                              {monthLabel.format(new Date(`${m.month}-01T00:00:00Z`))}
                            </td>
                            <td
                              className={cx(
                                "tabular-nums px-5 py-3 text-right text-body-sm font-semibold",
                                m.returnPercent >= 0 ? "text-success" : "text-error"
                              )}
                            >
                              {signed(m.returnPercent, 2)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  </Reveal>
                )}

                {record.news.closedCount > 0 && (
                  <Reveal className="mt-6">
                    <h3 className="text-h3 text-text-primary">{t("signals.type.news")}</h3>
                    <p className="mb-4 mt-1 max-w-3xl text-caption text-text-muted">{t("signals.newsNote")}</p>
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                      <Stat delay={0} label={t("Total sinyal ditutup")} value={String(record.news.closedCount)} />
                      <Stat delay={90}
                        label={t("signals.winRate")}
                        value={`${record.news.winRate.toFixed(0)}%`}
                        hint={t("signals.profitLoss", { wins: record.news.wins, losses: record.news.losses })}
                      />
                      <Stat delay={180}
                        label={t("signals.pipsEarned")}
                        value={`${signed(record.news.totalPips)} pips`}
                        tone={record.news.totalPips >= 0 ? "pos" : "neg"}
                        hint={t("signals.pipsEarnedDesc")}
                      />
                    </div>
                  </Reveal>
                )}
              </>
            )}
        </div>

        <p className="mx-auto mt-6 max-w-3xl text-center text-caption text-text-muted">
          {t("signals.disclaimer")} {t("Trading forex dan CFD berisiko tinggi dan tidak cocok untuk semua orang. Ini bukan nasihat keuangan.")}
        </p>
      </div>
    </section>
  );
}
