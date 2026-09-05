"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  NotebookText,
  Newspaper,
  BarChart3,
  Settings,
  LogOut,
  ShieldCheck,
  Menu,
  X,
} from "lucide-react";
import { cx } from "@/lib/utils";
import { signOut } from "@/app/(dashboard)/actions";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trades", label: "Trades Journal", icon: NotebookText },
  { href: "/news", label: "Economic News", icon: Newspaper },
  { href: "/reports", label: "Reports & Performance", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-topbar items-center justify-between border-b border-border bg-surface px-4 lg:hidden">
        <Link href="/dashboard" className="text-h3 font-display font-extrabold text-text-primary">
          Loki<span className="text-primary">4x</span>
        </Link>
        <button onClick={() => setMobileOpen(true)} className="text-text-primary" aria-label="Open menu">
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-50 flex w-sidebar flex-col border-r border-border bg-surface px-4 py-6 transition-transform duration-200 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="mb-8 flex items-center justify-between px-2">
          <Link href="/dashboard" className="text-h3 font-display font-extrabold text-text-primary">
            Loki<span className="text-primary">4x</span>
          </Link>
          <button onClick={() => setMobileOpen(false)} className="text-text-muted lg:hidden" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cx(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-body-sm font-medium transition-colors",
                  active
                    ? "bg-primary-subtle text-primary"
                    : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}

          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setMobileOpen(false)}
              className={cx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-body-sm font-medium transition-colors",
                pathname.startsWith("/admin")
                  ? "bg-primary-subtle text-primary"
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              )}
            >
              <ShieldCheck className="h-4 w-4" />
              Admin Panel
            </Link>
          )}
        </nav>

        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-body-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-error"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </form>
      </aside>
    </>
  );
}
