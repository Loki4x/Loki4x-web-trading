"use client";

import { useState } from "react";
import { Check, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { submitVipRequest, createPakasirPayment } from "@/app/(dashboard)/upgrade/actions";
import { PLAN_PRICE_IDR } from "@/lib/pakasir";
import type { VipIbRequest } from "@/lib/types";

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
];

const ADMIN_CONTACT_LINK = "https://t.me/LokiForex";

function formatIDR(amount: number) {
  return `Rp${amount.toLocaleString("id-ID")}`;
}

export function VipRequestForm({
  ibLink,
  existingRequest,
}: {
  ibLink: string;
  existingRequest: VipIbRequest | null;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (existingRequest && existingRequest.status !== "REJECTED") {
    return (
      <div className="card">
        <p className="text-body-sm text-text-secondary">Status pengajuan VIP kamu:</p>
        <p className={`mt-1 text-h3 ${statusClass[existingRequest.status]}`}>
          {statusLabel[existingRequest.status]}
        </p>
        {existingRequest.status === "PENDING" && (
          <p className="mt-2 text-body-sm text-text-muted">
            Admin akan meninjau pengajuanmu dan memverifikasi akun trading yang kamu daftarkan.
          </p>
        )}
      </div>
    );
  }

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSubmitting(true);
    try {
      await submitVipRequest(formData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengirim pengajuan");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="card">
        <h2 className="text-h3 text-text-primary">Cara 1 — Bayar Langsung</h2>
        <p className="mt-1 text-body-sm text-text-secondary">
          Pilih paket di bawah, lalu hubungi admin buat instruksi pembayaran.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {paidPlans.map((plan) => (
            <div
              key={plan.key}
              className={`relative rounded-2xl border p-5 ${
                plan.featured ? "border-primary bg-primary-subtle/30" : "border-border bg-surface-2"
              }`}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-caption font-bold uppercase tracking-wide text-text-on-primary">
                  Paling Populer
                </span>
              )}

              <h3 className="text-body font-semibold text-text-primary">{plan.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-h2 font-display font-extrabold text-text-primary">{plan.price}</span>
                <span className="text-body-sm text-text-muted">{plan.period}</span>
              </div>

              <ul className="mt-4 flex flex-col gap-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-body-sm text-text-secondary">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>

              <form action={createPakasirPayment}>
                <input type="hidden" name="plan" value={plan.key} />
                <button
                  type="submit"
                  className={`mt-5 flex w-full items-center justify-center rounded-full px-4 py-2.5 text-body-sm font-semibold transition-colors ${
                    plan.featured
                      ? "bg-primary text-text-on-primary hover:bg-primary-hover"
                      : "border border-border bg-surface-2 text-text-primary hover:bg-surface-hover"
                  }`}
                >
                  Bayar Sekarang — {formatIDR(PLAN_PRICE_IDR[plan.key])}
                </button>
              </form>
              <p className="mt-2 text-center text-caption text-text-muted">via QRIS / Virtual Account</p>
            </div>
          ))}
        </div>

        <a
          href={ADMIN_CONTACT_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex w-fit items-center gap-1.5 text-body-sm text-text-secondary underline-offset-2 hover:text-text-primary hover:underline"
        >
          Atau hubungi admin manual di Telegram
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="card">
        <h2 className="text-h3 text-text-primary">Cara 2 — Daftar via IB Broker</h2>
        <p className="mt-1 text-body-sm text-text-secondary">
          Daftar akun trading baru lewat link referral di bawah, lalu isi form ini biar admin bisa verifikasi.
        </p>

        <a
          href={ibLink}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary mt-4 inline-flex w-fit items-center gap-2"
        >
          Daftar Akun IB
          <ExternalLink className="h-4 w-4" />
        </a>

        {existingRequest?.status === "REJECTED" && (
          <p className="mt-4 rounded-lg bg-error-subtle px-4 py-3 text-body-sm text-error">
            Pengajuan sebelumnya ditolak. Silakan cek kembali data akunmu dan ajukan ulang.
          </p>
        )}

        {error && (
          <p className="mt-4 rounded-lg bg-error-subtle px-4 py-3 text-body-sm text-error">{error}</p>
        )}

        <form action={handleSubmit} className="mt-4 flex flex-col gap-4">
          <Input id="broker_email" name="broker_email" type="email" label="Email yang terdaftar di broker" placeholder="you@example.com" required />
          <Input id="trading_account_id" name="trading_account_id" type="text" label="ID Account Trading" placeholder="12345678" required />
          <Input id="first_deposit" name="first_deposit" type="number" label="Deposit Pertama (USD)" placeholder="15" min={0} step="0.01" required />
          <p className="text-caption text-text-muted">*Minimal deposit $15</p>
          <Button type="submit" loading={submitting} withArrow className="mt-2 w-full justify-center">
            Ajukan Verifikasi
          </Button>
        </form>
      </div>
    </div>
  );
}
