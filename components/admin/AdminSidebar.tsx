"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, LineChart, Compass, ArrowLeft, Menu, X, CircleUserRound, Newspaper, GraduationCap } from "lucide-react";
import { cx } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/signals", label: "Signals", icon: LineChart },
  { href: "/admin/positioning", label: "Positioning", icon: Compass },
  { href: "/admin/news", label: "Economic News", icon: Newspaper },
  { href: "/admin/academy", label: "Academy", icon: GraduationCap },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  function linkClass(active: boolean) {
    return cx(
      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[11px] font-medium transition-colors",
      active
        ? "bg-primary/15 text-primary"
        : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
    );
  }

  const brand = (
    <div className="flex items-center gap-2.5">
      <Image src="/logo.png" alt="Loki4x" width={32} height={32} className="rounded-full" />
      <span className="text-body font-display font-extrabold tracking-wide text-text-primary">
        LOKI4X TRADER
      </span>
      <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
        Admin
      </span>
    </div>
  );

  return (
    <>
      {/* Top bar - persistent across mobile and desktop */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-topbar items-center justify-between border-b border-border bg-surface px-4 lg:pl-sidebar">
        <button onClick={() => setMobileOpen(true)} className="text-text-primary lg:hidden" aria-label="Open menu">
          <Menu className="h-6 w-6" />
        </button>
        <Link href="/settings" className="ml-auto text-text-primary" aria-label="Profile & Settings">
          <CircleUserRound className="h-6 w-6" />
        </Link>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-50 flex w-sidebar flex-col overflow-y-auto border-r border-border bg-surface px-4 py-6 transition-transform duration-200 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="mb-8 flex items-center justify-between px-1">
          <Link href="/admin" onClick={() => setMobileOpen(false)}>
            {brand}
          </Link>
          <button onClick={() => setMobileOpen(false)} className="text-text-muted lg:hidden" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={linkClass(pathname === href)}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <Link
          href="/dashboard"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[11px] font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to App
        </Link>
      </aside>
    </>
  );
}
