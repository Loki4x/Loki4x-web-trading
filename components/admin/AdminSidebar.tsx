"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, ArrowLeft, Menu, X } from "lucide-react";
import { cx } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-topbar items-center justify-between border-b border-border bg-surface px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <span className="text-h3 font-display font-extrabold text-text-primary">
            Loki<span className="text-primary">4x</span>
          </span>
          <span className="rounded-md bg-primary/15 px-2 py-0.5 text-caption font-bold text-primary">ADMIN</span>
        </div>
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
          <Link href="/admin" className="flex items-center gap-2">
            <span className="text-h3 font-display font-extrabold text-text-primary">
              Loki<span className="text-primary">4x</span>
            </span>
            <span className="rounded-md bg-primary/15 px-2 py-0.5 text-caption font-bold text-primary">ADMIN</span>
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
                    ? "bg-primary/15 text-primary"
                    : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/dashboard"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-body-sm font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to App
        </Link>
      </aside>
    </>
  );
}
