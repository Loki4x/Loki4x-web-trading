import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCotHistory, COT_WATCHLIST } from "@/lib/cot";
import { CotHistoryClient } from "@/components/cot/CotHistoryClient";
import { getCurrentUserTier, hasAccess } from "@/lib/tier";
import { AccessDenied } from "@/components/ui/AccessDenied";

export default async function CotAssetHistoryPage({ params }: { params: { asset: string } }) {
  const tier = await getCurrentUserTier();
  if (!hasAccess(tier, "VIP")) {
    return <AccessDenied requiredTier="VIP" />;
  }

  const label = params.asset.toUpperCase();
  const watch = COT_WATCHLIST.find((w) => w.label === label);
  if (!watch) notFound();

  const points = await getCotHistory(label);

  return (
    <main className="mx-auto max-w-content px-6 py-8">
      <Link href="/cot" className="mb-4 flex w-fit items-center gap-1.5 text-body-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" />
        Kembali ke COT Dashboard
      </Link>

      <div className="mb-6">
        <h1 className="text-h2 text-text-primary">Riwayat Institutional Positioning · {label}</h1>
        <p className="text-body-sm text-text-secondary">Pantau pergerakan arus big money dari waktu ke waktu.</p>
      </div>

      <CotHistoryClient label={label} points={points} />
    </main>
  );
}
