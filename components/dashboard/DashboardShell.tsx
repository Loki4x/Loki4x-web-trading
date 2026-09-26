"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { cx } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const SIDEBAR_PREF_KEY = "loki4x_sidebar_open";

export function DashboardShell({
  isAdmin,
  notifications = [],
  children,
}: {
  isAdmin?: boolean;
  notifications?: NotificationItem[];
  children: React.ReactNode;
}) {
  // Default terbuka; nilai asli diambil dari localStorage setelah mount
  // (dibaca di useEffect supaya tidak mismatch dengan server render).
  const [desktopOpen, setDesktopOpen] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_PREF_KEY);
    if (stored !== null) setDesktopOpen(stored === "1");
  }, []);

  function toggleDesktop() {
    setDesktopOpen((prev) => {
      const next = !prev;
      window.localStorage.setItem(SIDEBAR_PREF_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        isAdmin={isAdmin}
        notifications={notifications}
        desktopOpen={desktopOpen}
        onToggleDesktop={toggleDesktop}
      />
      <div
        className={cx(
          "pt-topbar transition-[padding] duration-200",
          desktopOpen ? "lg:pl-sidebar" : "lg:pl-0"
        )}
      >
        {children}
      </div>
    </div>
  );
}
