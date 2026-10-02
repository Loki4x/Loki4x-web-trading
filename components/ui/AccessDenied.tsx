import Link from "next/link";
import { Lock } from "lucide-react";
import type { Tier } from "@/lib/tier";
import { getT } from "@/lib/i18n/server";

const tierLabel: Record<Tier, string> = {
  FREE: "Free",
  VIP: "VIP",
  MEMBERSHIP: "Membership",
};

export async function AccessDenied({ requiredTier }: { requiredTier: Tier }) {
  const { t } = await getT();
  return (
    <main className="mx-auto flex max-w-content flex-col items-center justify-center px-6 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-subtle">
        <Lock className="h-8 w-8 text-primary" />
      </div>
      <h1 className="mt-6 text-h2 text-text-primary">{t("access.title")}</h1>
      <p className="mt-2 max-w-sm text-body-sm text-text-secondary">
        {t("access.desc1")} <strong>{tierLabel[requiredTier]}</strong> {t("access.desc2")}
      </p>
      <Link href="/#pricing" className="btn-primary mt-6">
        {t("access.cta")}
      </Link>
    </main>
  );
}
