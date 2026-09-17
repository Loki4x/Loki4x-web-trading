"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { markNotificationRead, markAllNotificationsRead } from "@/app/(dashboard)/notifications/actions";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export function NotificationBell({ notifications }: { notifications: NotificationItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function handleOpenItem(id: string, isRead: boolean) {
    if (!isRead) {
      await markNotificationRead(id);
      router.refresh();
    }
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    router.refresh();
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((prev) => !prev)} className="relative text-text-primary" aria-label="Notifikasi">
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 max-h-96 w-80 overflow-y-auto rounded-lg border border-border bg-surface shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-body-sm font-semibold text-text-primary">Notifikasi</p>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} className="text-caption text-primary hover:text-primary-hover">
                  Tandai semua dibaca
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-body-sm text-text-muted">Belum ada notifikasi.</p>
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleOpenItem(n.id, n.is_read)}
                    className={`flex flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-surface-hover ${
                      !n.is_read ? "bg-primary-subtle/20" : ""
                    }`}
                  >
                    <p className="text-body-sm font-medium text-text-primary">{n.title}</p>
                    <p className="text-caption text-text-secondary">{n.message}</p>
                    <p className="text-caption text-text-muted">
                      {new Date(n.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
