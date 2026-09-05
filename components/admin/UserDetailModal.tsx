"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getUserStats } from "@/app/admin/actions";
import { formatCurrency, formatDate, pnlColorClass } from "@/lib/utils";
import type { Profile } from "@/lib/types";

interface Stats {
  totalTrades: number;
  winRate: number;
  recentTrades: { id: string; symbol: string; side: string; pnl: number | null; status: string; trade_date: string }[];
}

export function UserDetailModal({ user, onClose }: { user: Profile; onClose: () => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserStats(user.id).then((data) => {
      setStats(data);
      setLoading(false);
    });
  }, [user.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-h3 text-text-primary">User Detail</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-1 text-body font-semibold text-text-primary">{user.full_name || "—"}</p>
        <p className="mb-5 text-body-sm text-text-secondary">{user.email}</p>

        {loading ? (
          <p className="text-body-sm text-text-muted">Loading stats...</p>
        ) : (
          <>
            <div className="mb-5 grid grid-cols-2 gap-4">
              <div className="card !p-4">
                <p className="text-caption text-text-secondary">Total Trades</p>
                <p className="text-h3 text-text-primary">{stats?.totalTrades ?? 0}</p>
              </div>
              <div className="card !p-4">
                <p className="text-caption text-text-secondary">Win Rate</p>
                <p className="text-h3 text-text-primary">{(stats?.winRate ?? 0).toFixed(1)}%</p>
              </div>
            </div>

            <h3 className="mb-2 text-body-sm font-semibold text-text-secondary">Recent Trades</h3>
            {stats && stats.recentTrades.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {stats.recentTrades.map((t) => (
                  <li key={t.id} className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-body-sm">
                    <span className="text-text-primary">{t.symbol} · {t.side}</span>
                    <span className={pnlColorClass(t.pnl ?? 0)}>
                      {t.pnl !== null ? formatCurrency(t.pnl) : "—"}
                    </span>
                    <span className="text-caption text-text-muted">{formatDate(t.trade_date)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-body-sm text-text-muted">No trades logged yet.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
