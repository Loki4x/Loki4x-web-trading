import type { Tier } from "@/lib/tier";
import { getT } from "@/lib/i18n/server";
import { dateLocale } from "@/lib/i18n/dictionary";
import Link from "next/link";

const tierLabel: Record<Tier, string> = {
  FREE: "Free",
  VIP: "VIP",
  MEMBERSHIP: "Membership",
};

export async function MembershipStatusBar({ tier, expiresAt }: { tier: Tier; expiresAt: string | null }) {
  const { t, locale } = await getT();
  const isActive = tier !== "FREE";

  const expiresLabel = expiresAt
    ? new Date(expiresAt).toLocaleDateString(dateLocale(locale), { day: "numeric", month: "long", year: "numeric" })
    : isActive
      ? "Lifetime"
      : "—";

  // Tinggal ≤7 hari (dan belum lewat): tampilkan tombol Perpanjang.
  const daysLeft = isActive && expiresAt ? Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000) : null;
  const expiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="card">
        <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">{t("Status Membership")}</p>
        <p className={`mt-1 text-h3 ${isActive ? "text-success" : "text-error"}`}>
          {isActive ? t("Aktif") : t("Belum Aktif")}
        </p>
      </div>
      <div className="card">
        <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">{t("Paket")}</p>
        <p className="mt-1 text-h3 text-text-primary">{tierLabel[tier]}</p>
      </div>
      <div className="card">
        <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">{t("Berlaku Hingga")}</p>
        <p className="mt-1 text-h3 text-text-primary">{expiresLabel}</p>
        {expiringSoon && (
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-caption text-warning">
              {daysLeft === 0 ? t("Berakhir hari ini") : t("Tersisa {n} hari", { n: daysLeft })}
            </p>
            <Link href="/upgrade" className="btn-primary !px-3 !py-1 text-caption">
              {t("Perpanjang")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

