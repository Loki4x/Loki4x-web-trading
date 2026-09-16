"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { approveVipRequest, rejectVipRequest } from "@/app/admin/actions";

interface RequestRow {
  id: string;
  user_id: string;
  broker_email: string;
  trading_account_id: string;
  first_deposit: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
  profiles: { full_name: string | null; email: string | null } | null;
}

export function VipRequestsTable({ requests }: { requests: RequestRow[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleApprove(id: string, userId: string) {
    setLoadingId(id);
    await approveVipRequest(id, userId);
    router.refresh();
    setLoadingId(null);
  }

  async function handleReject(id: string) {
    setLoadingId(id);
    await rejectVipRequest(id);
    router.refresh();
    setLoadingId(null);
  }

  if (requests.length === 0) {
    return <div className="card text-body-sm text-text-muted">Belum ada pengajuan.</div>;
  }

  return (
    <div className="card overflow-x-auto !p-0">
      <table className="w-full text-body-sm">
        <thead>
          <tr className="border-b border-border text-left text-caption uppercase text-text-muted">
            <th className="px-4 py-3">User</th>
            <th className="px-4 py-3">Broker Email</th>
            <th className="px-4 py-3">Account ID</th>
            <th className="px-4 py-3">Deposit</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => (
            <tr key={r.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3 text-text-primary">{r.profiles?.full_name || r.profiles?.email || r.user_id}</td>
              <td className="px-4 py-3">{r.broker_email}</td>
              <td className="px-4 py-3">{r.trading_account_id}</td>
              <td className="px-4 py-3">${r.first_deposit}</td>
              <td className="px-4 py-3">{r.status}</td>
              <td className="px-4 py-3">
                {r.status === "PENDING" && (
                  <div className="flex gap-2">
                    <button onClick={() => handleApprove(r.id, r.user_id)} disabled={loadingId === r.id} className="flex items-center gap-1 rounded-lg bg-success/15 px-3 py-1.5 text-success hover:bg-success/25">
                      <Check className="h-4 w-4" /> Approve
                    </button>
                    <button onClick={() => handleReject(r.id)} disabled={loadingId === r.id} className="flex items-center gap-1 rounded-lg bg-error-subtle px-3 py-1.5 text-error hover:bg-error/25">
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
