"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Ban, CheckCircle, Eye, Crown } from "lucide-react";
import { cx, formatDate } from "@/lib/utils";
import { toggleSuspend } from "@/app/admin/actions";
import { ChangeTierModal } from "@/components/admin/ChangeTierModal";
import { UserDetailModal } from "@/components/admin/UserDetailModal";
import type { Profile } from "@/lib/types";

type RoleFilter = "ALL" | "FREE" | "VIP" | "ADMIN";
const PAGE_SIZE = 10;

export function UsersTable({ users }: { users: Profile[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<RoleFilter>("ALL");
  const [page, setPage] = useState(1);
  const [tierModalUser, setTierModalUser] = useState<Profile | null>(null);
  const [detailModalUser, setDetailModalUser] = useState<Profile | null>(null);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = search.toLowerCase();
      if (q && !(u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))) return false;
      if (role === "ADMIN" && !u.is_admin) return false;
      if (role === "FREE" && (u.tier !== "FREE" || u.is_admin)) return false;
      if (role === "VIP" && u.tier !== "VIP") return false;
      return true;
    });
  }, [users, search, role]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleToggleSuspend(user: Profile) {
    const action = user.is_suspended ? "unsuspend" : "suspend";
    if (!confirm(`Are you sure you want to ${action} ${user.full_name || user.email}?`)) return;
    await toggleSuspend(user.id, !user.is_suspended);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search name or email"
            className="input-field pl-9"
          />
        </div>
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value as RoleFilter);
            setPage(1);
          }}
          className="input-field w-auto"
        >
          <option value="ALL">All Roles</option>
          <option value="FREE">Free</option>
          <option value="VIP">VIP</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>

      <div className="card overflow-x-auto !p-0">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface text-left">
              {["User", "Role", "Status", "Joined", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-secondary">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-body-sm text-text-muted">
                  No users match your filters.
                </td>
              </tr>
            )}
            {paginated.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                <td className="px-4 py-3">
                  <p className="text-body-sm font-semibold text-text-primary">{u.full_name || "—"}</p>
                  <p className="text-caption text-text-muted">{u.email}</p>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cx(
                      "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-caption font-bold",
                      u.is_admin
                        ? "bg-warning-subtle text-warning"
                        : u.tier === "VIP"
                        ? "bg-primary/15 text-primary"
                        : "bg-surface-2 text-text-secondary"
                    )}
                  >
                    {u.tier === "VIP" && !u.is_admin && <Crown className="h-3 w-3" />}
                    {u.is_admin ? "ADMIN" : u.tier}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cx(
                      "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-caption font-semibold",
                      u.is_suspended ? "bg-error-subtle text-error" : "bg-success-subtle text-success"
                    )}
                  >
                    <span className={cx("h-1.5 w-1.5 rounded-full", u.is_suspended ? "bg-error" : "bg-success")} />
                    {u.is_suspended ? "Suspended" : "Active"}
                  </span>
                </td>
                <td className="px-4 py-3 text-body-sm text-text-secondary">{formatDate(u.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => setTierModalUser(u)}
                      className="text-caption font-semibold text-primary hover:underline"
                    >
                      Change Tier
                    </button>
                    <button
                      onClick={() => handleToggleSuspend(u)}
                      className={cx(
                        "flex items-center gap-1 text-caption font-semibold hover:underline",
                        u.is_suspended ? "text-success" : "text-error"
                      )}
                    >
                      {u.is_suspended ? <CheckCircle className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                      {u.is_suspended ? "Unsuspend" : "Suspend"}
                    </button>
                    <button
                      onClick={() => setDetailModalUser(u)}
                      className="text-text-muted hover:text-text-primary"
                      aria-label="View detail"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={cx(
                "h-8 w-8 rounded-md text-body-sm font-medium",
                page === i + 1 ? "bg-primary text-text-on-primary" : "text-text-secondary hover:bg-surface-hover"
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {tierModalUser && <ChangeTierModal user={tierModalUser} onClose={() => setTierModalUser(null)} />}
      {detailModalUser && <UserDetailModal user={detailModalUser} onClose={() => setDetailModalUser(null)} />}
    </div>
  );
}
