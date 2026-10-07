import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { PortfolioGrowthChart } from "@/components/signals/PortfolioGrowthChart";
import { getPublicTrackRecord } from "@/lib/public-track-record";
import { getT } from "@/lib/i18n/server";
import { dateLocale } from "@/lib/i18n/dictionary";
import { cx } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Track Record Sinyal — Loki4x Academy",
  description: "Ringkasan performa sinyal trading Loki4x Academy: pertumbuhan, win rate, drawdown, dan performa per bulan.",
  openGraph: {
    title: "Track Record Sinyal — Loki4x Academy",
    description: "Ringkasan performa sinyal trading yang transparan.",
    type: "website",
  },
};

function Stat({ label, value, tone, hint }: { label: string; value: string; tone?: "pos" | "neg"; hint?: string }) {
  return (
    <div className="card !p-4">
      <p className="text-caption text-text-secondary">{label}</p>
      <p className={cx("text-h3", tone === "pos" && "text-success", tone === "neg" && "text-error")}>{value}</p>
      {hint && <p className="text-caption text-text-muted">{hint}</p>}
    </div>
  );
}

const signed = (n: number, digits = 1) => `${n > 0 ? "+" : ""}${n.toFixed(digits)}`;

export default async function TrackRecordPage() {
  const { t, locale } = await getT();

  let record: Awaited<ReturnType<typeof getPublicTrackRecord>> | null = null;
  try {
    record = await getPublicTrackRecord();
  } catch (err) {
    console.error("[track-record]", err);
  }

  const monthLabel = new Intl.DateTimeFormat(dateLocale(locale), { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-content px-6 py-10">
        <div className="mb-8 max-w-2xl">
          <h1 className="text-h1 text-text-primary">{t("Track Record Sinyal")}</h1>
          <p className="mt-2 text-body text-text-secondary">
            {t("Ringkasan performa semua sinyal yang sudah ditutup. Angka dihitung otomatis dari data sinyal kami.")}
          </p>
        </div>

        {!record || record.closedCount === 0 ? (
          <div className="card text-center text-body-sm text-text-muted">{t("Data track record belum tersedia.")}</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              <Stat
                label={t("signals.totalR")}
                value={`${signed(record.stats.totalR)}R`}
                tone={record.stats.totalR >= 0 ? "pos" : "neg"}
                hint={`${t("signals.rTrades", { count: record.stats.rTradeCount })} · ${t("signals.simGrowth")} ${signed(record.stats.totalGrowthPercent)}%`}
              />
              <Stat
                label={t("signals.winRate")}
                value={`${record.stats.winRate.toFixed(0)}%`}
                hint={t("signals.profitLoss", { wins: record.stats.wins, losses: record.stats.losses })}
              />
              <Stat
                label={t("signals.maxDrawdown")}
                value={`${record.stats.maxDrawdownPercent.toFixed(1)}%`}
                tone="neg"
                hint={t("signals.maxDrawdownDesc")}
              />
              <Stat
                label={t("signals.pipsEarned")}
                value={`${signed(record.stats.totalPips)} pips`}
                tone={record.stats.totalPips >= 0 ? "pos" : "neg"}
                hint={t("signals.pipsEarnedDesc")}
              />
              <Stat label={t("Total sinyal ditutup")} value={String(record.closedCount)} />
            </div>

            <div className="mt-6">
              <PortfolioGrowthChart points={record.growth} />
            </div>

            {record.monthly.length > 0 && (
              <div className="card mt-6 overflow-x-auto !p-0">
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
            )}
          </>
        )}

        <p className="mt-6 max-w-3xl text-caption text-text-muted">
          {t("signals.disclaimer")} {t("Trading forex dan CFD berisiko tinggi dan tidak cocok untuk semua orang. Ini bukan nasihat keuangan.")}
        </p>

        <div className="card mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-h3 text-text-primary">{t("Mau akses sinyal lengkapnya?")}</h2>
            <p className="text-body-sm text-text-secondary">
              {t("Daftar gratis, lalu upgrade ke VIP atau Membership untuk melihat setiap sinyal, entry, TP, SL, dan analisanya.")}
            </p>
          </div>
          <Link href="/signup" className="btn-primary shrink-0 text-body-sm">
            {t("Daftar Sekarang")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
