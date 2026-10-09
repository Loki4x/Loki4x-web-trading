"use client";

import { useState } from "react";
import { Check, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { submitVipRequest } from "@/app/(dashboard)/upgrade/actions";
import { PLAN_PRICE_IDR, type MembershipTierName, type Plan } from "@/lib/pakasir-constants";
import { PaymentModal } from "@/components/upgrade/PaymentModal";
import type { VipIbRequest } from "@/lib/types";
import { useT } from "@/lib/i18n/client";

const statusLabel: Record<VipIbRequest["status"], string> = {
  PENDING: "Sedang diproses",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
};

const statusClass: Record<VipIbRequest["status"], string> = {
  PENDING: "text-warning",
  APPROVED: "text-success",
  REJECTED: "text-error",
};

// Sama seperti pricing di landing page (components/landing/Pricing.tsx),
// versi ringkas + copy Indonesia buat halaman upgrade.
const paidPlans = [
  {
    key: "VIP" as const,
    name: "VIP",
    price: "$20",
    period: "/ bulan",
    features: ["Signals & Track Record", "Market Positioning"],
    featured: false,
  },
  {
    key: "MEMBERSHIP" as const,
    name: "Membership",
    price: "$35",
    period: "/ bulan",
    features: ["Semua fitur VIP", "Journal, Reports, Calculator", "Economic Calendar & Academy"],
    featured: true,
  },
  {
    key: "MEMBERSHIP_LIFETIME" as const,
    name: "Membership Lifetime",
    price: "$70",
    period: "sekali bayar",
    features: ["Semua fitur Membership", "Bayar sekali, akses selamanya", "Nggak perlu perpanjang tiap bulan"],
    featured: false,
  },
];

const ADMIN_CONTACT_LINK = "https://t.me/LokiForex";

const GRID_COLS: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
};

// Label tombol menyesuaikan status: user baru "Bayar Sekarang", member aktif
// "Perpanjang" (tier sama) atau "Upgrade" (tier lebih tinggi).
function planCtaLabel(planKey: Plan, activeTier: MembershipTierName) {
  if (activeTier === "FREE") return "Bayar Sekarang";
  if (planKey === "MEMBERSHIP_LIFETIME") return "Beli Lifetime";
  const planTier = planKey === "VIP" ? "VIP" : "MEMBERSHIP";
  return planTier === activeTier ? "Perpanjang" : "Upgrade";
}

function formatIDR(amount: number) {
  return `Rp${amount.toLocaleString("id-ID")}`;
}

export function VipRequestForm({
  ibLink,
  existingRequest,
  plans,
  activeTier,
  showIbPath,
}: {
  ibLink: string;
  existingRequest: VipIbRequest | null;
  /** Paket yang boleh dibeli akun ini (dari purchasablePlans di server). */
  plans: Plan[];
  activeTier: MembershipTierName;
  /** Jalur "Daftar via IB" cuma untuk akun FREE. */
  showIbPath: boolean;
}) {
  const t = useT();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openPlan, setOpenPlan] = useState<Plan | null>(null);

  const visiblePlans = paidPlans.filter((plan) => plans.includes(plan.key));

  if (showIbPath && existingRequest && existingRequest.status !== "REJECTED") {
    return (
      <div className="card">
        <p className="text-body-sm text-text-secondary">{t("Status pengajuan VIP kamu:")}</p>
        <p className={`mt-1 text-h3 ${statusClass[existingRequest.status]}`}>
          {t(statusLabel[existingRequest.status])}
        </p>
        {existingRequest.status === "PENDING" && (
          <p className="mt-2 text-body-sm text-text-muted">
            {t("Admin akan meninjau pengajuanmu dan memverifikasi akun trading yang kamu daftarkan.")}
          </p>
        )}
      </div>
    );
  }

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSubmitting(true);
    try {
      const res = await submitVipRequest(formData);
      if (!res.ok) setError(res.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Gagal mengirim pengajuan"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="card">
        <h2 className="text-h3 text-text-primary">{showIbPath ? t("Cara 1 — Bayar Langsung") : t("Pilih Paket")}</h2>
        <p className="mt-1 text-body-sm text-text-secondary">
          {t("Pilih paket di bawah, lalu selesaikan pembayaran lewat QRIS, transfer bank, atau USDT.")}
        </p>

        <div className={`mt-5 grid grid-cols-1 gap-4 ${GRID_COLS[visiblePlans.length] ?? "sm:grid-cols-3"}`}>
          {visiblePlans.map((plan) => (
            <div
              key={plan.key}
              className={`relative rounded-2xl border p-5 ${
                plan.featured ? "border-primary bg-primary-subtle/30" : "border-border bg-surface-2"
              }`}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-1.5 py-0.5 text-badge font-bold leading-none uppercase tracking-wide text-text-on-primary">
                  {t("Paling Populer")}
                </span>
              )}

              <h3 className="text-body font-semibold text-text-primary">{t(plan.name)}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-h2 font-display font-extrabold text-text-primary">{plan.price}</span>
                <span className="text-body-sm text-text-muted">{t(plan.period)}</span>
              </div>

              <ul className="mt-4 flex flex-col gap-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-body-sm text-text-secondary">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {t(f)}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => setOpenPlan(plan.key)}
                className={`mt-5 flex w-full items-center justify-center rounded-full px-4 py-2.5 text-body-sm font-semibold transition-colors ${
                  plan.featured
                    ? "bg-primary text-text-on-primary hover:bg-primary-hover"
                    : "border border-border bg-surface-2 text-text-primary hover:bg-surface-hover"
                }`}
              >
                {t(planCtaLabel(plan.key, activeTier))} — {formatIDR(PLAN_PRICE_IDR[plan.key])}
              </button>
              <p className="mt-2 text-center text-caption text-text-muted">{t("QRIS · Transfer Bank · USDT")}</p>
            </div>
          ))}
        </div>

        <a
          href={ADMIN_CONTACT_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex w-fit items-center gap-1.5 text-body-sm text-text-secondary underline-offset-2 hover:text-text-primary hover:underline"
        >
          {t("Atau hubungi admin manual di Telegram")}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {showIbPath && (
        <div className="card">
          <h2 className="text-h3 text-text-primary">{t("Cara 2 — Daftar via IB Broker")}</h2>
          <p className="mt-1 text-body-sm text-text-secondary">
            {t("Daftar akun trading baru lewat link referral di bawah, lalu isi form ini biar admin bisa verifikasi.")}
          </p>

          <a
            href={ibLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary mt-4 inline-flex w-fit items-center gap-2"
          >
            {t("Daftar Akun IB")}
            <ExternalLink className="h-4 w-4" />
          </a>

          {existingRequest?.status === "REJECTED" && (
            <p className="mt-4 rounded-lg bg-error-subtle px-4 py-3 text-body-sm text-error">
              {t("Pengajuan sebelumnya ditolak. Silakan cek kembali data akunmu dan ajukan ulang.")}
            </p>
          )}

          {error && (
            <p className="mt-4 rounded-lg bg-error-subtle px-4 py-3 text-body-sm text-error">{error}</p>
          )}

          <form action={handleSubmit} className="mt-4 flex flex-col gap-4">
            <Input id="broker_email" name="broker_email" type="email" label={t("Email yang terdaftar di broker")} placeholder="you@example.com" required />
            <Input id="trading_account_id" name="trading_account_id" type="text" label={t("ID Account Trading")} placeholder="12345678" required />
            <Input id="first_deposit" name="first_deposit" type="number" label={t("Deposit Pertama (USD)")} placeholder="15" min={0} step="0.01" required />
            <p className="text-caption text-text-muted">{t("*Minimal deposit $15")}</p>
            <Button type="submit" loading={submitting} withArrow className="mt-2 w-full justify-center">
              {t("Ajukan Verifikasi")}
            </Button>
          </form>
        </div>
      )}

      {openPlan && <PaymentModal plan={openPlan} onClose={() => setOpenPlan(null)} />}
    </div>
  );
}
