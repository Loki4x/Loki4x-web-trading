"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { approveVipRequest, rejectVipRequest } from "@/app/admin/actions";
import { useT } from "@/lib/i18n/client";
import { brokerName } from "@/lib/brokers";
import { RejectReasonModal } from "@/components/admin/RejectReasonModal";

interface RequestRow {
  id: string;
  user_id: string;
  broker_email: string;
  trading_account_id: string;
  broker?: string;
  first_deposit: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejection_reason?: string | null;
  created_at: string;
  profiles: { full_name: string | null; email: string | null } | null;
}

export function VipRequestsTable({ requests }: { requests: RequestRow[] }) {
  const t = useT();
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<RequestRow | null>(null);

  async function handleApprove(id: string, userId: string) {
    setLoadingId(id);
    await approveVipRequest(id, userId);
    router.refresh();
    setLoadingId(null);
  }

  async function handleReject(id: string, reason: string) {
    setLoadingId(id);
    await rejectVipRequest(id, reason);
    setRejecting(null);
    router.refresh();
    setLoadingId(null);
  }

  if (requests.length === 0) {
    return <div className="card text-body-sm text-text-muted">{t("Belum ada pengajuan.")}</div>;
  }

  return (
    <div className="card overflow-x-auto !p-0">
      <table className="w-full text-body-sm">
        <thead>
          <tr className="border-b border-border text-left text-caption uppercase text-text-muted">
            <th className="px-4 py-3">User</th>
            <th className="px-4 py-3">Broker</th>
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
              <td className="px-4 py-3">{brokerName(r.broker)}</td>
              <td className="px-4 py-3">{r.broker_email}</td>
              <td className="px-4 py-3">{r.trading_account_id}</td>
              <td className="px-4 py-3">${r.first_deposit}</td>
              <td className="px-4 py-3">
                {r.status}
                {r.status === "REJECTED" && r.rejection_reason && (
                  <p className="mt-1 max-w-[220px] text-caption text-text-muted">{r.rejection_reason}</p>
                )}
              </td>
              <td className="px-4 py-3">
                {r.status === "PENDING" && (
                  <div className="flex gap-2">
                    <button onClick={() => handleApprove(r.id, r.user_id)} disabled={loadingId === r.id} className="flex items-center gap-1 rounded-lg bg-success/15 px-3 py-1.5 text-success hover:bg-success/25">
                      <Check className="h-4 w-4" /> Approve
                    </button>
                    <button onClick={() => setRejecting(r)} disabled={loadingId === r.id} className="flex items-center gap-1 rounded-lg bg-error-subtle px-3 py-1.5 text-error hover:bg-error/25">
                      <X className="h-4 w-4" /> Reject
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rejecting && (
        <RejectReasonModal
          title={t("Tolak pengajuan VIP")}
          subtitle={rejecting.profiles?.full_name || rejecting.profiles?.email || rejecting.user_id}
          onCancel={() => setRejecting(null)}
          onConfirm={(reason) => handleReject(rejecting.id, reason)}
        />
      )}
    </div>
  );
}
