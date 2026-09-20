"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, FileImage } from "lucide-react";
import { approveUsdtPayment, rejectUsdtPayment } from "@/app/admin/actions";

interface PaymentRow {
  id: string;
  user_id: string;
  order_id: string;
  plan: "VIP" | "MEMBERSHIP";
  amount: number;
  status: "PENDING" | "COMPLETED" | "FAILED";
  slip_url: string | null;
  note: string | null;
  payment_method: string | null;
  created_at: string;
  profiles: { full_name: string | null; email: string | null } | null;
}

const statusClass: Record<PaymentRow["status"], string> = {
  PENDING: "text-warning",
  COMPLETED: "text-success",
  FAILED: "text-error",
};

export function UsdtPaymentsTable({ payments }: { payments: PaymentRow[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleApprove(p: PaymentRow) {
    setLoadingId(p.id);
    await approveUsdtPayment(p.id, p.user_id, p.plan);
    router.refresh();
    setLoadingId(null);
  }

  async function handleReject(id: string) {
    setLoadingId(id);
    await rejectUsdtPayment(id);
    router.refresh();
    setLoadingId(null);
  }

  if (payments.length === 0) {
    return <div className="card text-body-sm text-text-muted">Belum ada pembayaran USDT.</div>;
  }

  return (
    <div className="card overflow-x-auto !p-0">
      <table className="w-full text-body-sm">
        <thead>
          <tr className="border-b border-border text-left text-caption uppercase text-text-muted">
            <th className="px-4 py-3">User</th>
            <th className="px-4 py-3">Paket</th>
            <th className="px-4 py-3">Jumlah</th>
            <th className="px-4 py-3">Network</th>
            <th className="px-4 py-3">Bukti</th>
            <th className="px-4 py-3">Catatan</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3 text-text-primary">{p.profiles?.full_name || p.profiles?.email || p.user_id}</td>
              <td className="px-4 py-3">{p.plan}</td>
              <td className="px-4 py-3">{p.amount} USDT</td>
              <td className="px-4 py-3 uppercase">{p.payment_method?.replace("usdt_", "")}</td>
              <td className="px-4 py-3">
                {p.slip_url ? (
                  <a
                    href={p.slip_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <FileImage className="h-4 w-4" /> Lihat
                  </a>
                ) : (
                  "-"
                )}
              </td>
              <td className="px-4 py-3 max-w-[160px] truncate text-text-muted">{p.note || "-"}</td>
              <td className={`px-4 py-3 font-medium ${statusClass[p.status]}`}>{p.status}</td>
              <td className="px-4 py-3">
                {p.status === "PENDING" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(p)}
                      disabled={loadingId === p.id}
                      className="flex items-center gap-1 rounded-lg bg-success/15 px-3 py-1.5 text-success hover:bg-success/25"
                    >
                      <Check className="h-4 w-4" /> Approve
                    </button>
                    <button
                      onClick={() => handleReject(p.id)}
                      disabled={loadingId === p.id}
                      className="flex items-center gap-1 rounded-lg bg-error-subtle px-3 py-1.5 text-error hover:bg-error/25"
                    >
                      <X className="h-4 w-4" /> Reject
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
