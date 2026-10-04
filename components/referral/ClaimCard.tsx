"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { claimReferralReward } from "@/app/(dashboard)/referral/actions";
import { useT } from "@/lib/i18n/client";
import { cx } from "@/lib/utils";

export function ClaimCard({
  balance,
  threshold,
  blocked,
}: {
  balance: number;
  threshold: number;
  blocked: "MEMBERSHIP" | "PERMANENT_VIP" | null;
}) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const enough = balance >= threshold;
  const percent = Math.min(100, Math.round((balance / threshold) * 100));

  function claim() {
    setResult(null);
    startTransition(async () => {
      try {
        const r = await claimReferralReward();
        setResult({ ok: r.ok, text: r.message });
        if (r.ok) router.refresh();
      } catch {
        setResult({ ok: false, text: t("Terjadi kesalahan.") });
      }
    });
  }

  return (
    <div className="card mt-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-body-sm font-medium text-text-secondary">{t("Saldo hari VIP")}</p>
          <p className="text-h3 text-text-primary">
            {balance} <span className="text-body-sm font-normal text-text-muted">/ {threshold} {t("hari")}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={claim}
          disabled={!enough || !!blocked || pending}
          className="btn-primary flex shrink-0 items-center gap-2 text-body-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("Klaim hari VIP")}
        </button>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className={cx("h-full rounded-full transition-all", enough ? "bg-success" : "bg-primary")} style={{ width: `${percent}%` }} />
      </div>

      <p className="mt-2 text-caption text-text-muted">
        {enough
          ? t("Saldo sudah cukup. Seluruh saldo ({balance} hari) akan ditambahkan sebagai VIP saat diklaim.", { balance })
          : t("Kumpulkan {remaining} hari lagi untuk bisa mengklaim.", { remaining: threshold - balance })}
      </p>

      {enough && blocked === "MEMBERSHIP" && (
        <p className="mt-2 text-caption text-warning">
          {t("Kamu sedang Membership, jadi hadiah VIP belum bisa diklaim. Saldo tetap aman dan bisa diklaim saat akunmu bukan Membership.")}
        </p>
      )}
      {enough && blocked === "PERMANENT_VIP" && (
        <p className="mt-2 text-caption text-warning">
          {t("VIP kamu sudah tanpa batas waktu, jadi belum ada yang bisa ditambah. Saldo tetap tersimpan.")}
        </p>
      )}
      {result && <p className={cx("mt-2 text-body-sm", result.ok ? "text-success" : "text-error")}>{result.text}</p>}
    </div>
  );
}
