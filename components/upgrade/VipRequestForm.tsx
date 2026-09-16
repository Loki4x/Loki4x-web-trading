"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { submitVipRequest } from "@/app/(dashboard)/upgrade/actions";
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
          Upgrade VIP seharga $20 lewat pembayaran langsung. Hubungi admin buat instruksi pembayaran.
        </p>
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
