"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
  ChevronDown,
  LineChart,
  Compass,
  Calculator,
  GraduationCap,
  CircleUserRound,
} from "lucide-react";
import { cx } from "@/lib/utils";
import { signOut } from "@/app/(dashboard)/actions";

const topLinks = [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }];

const groups = [
  {
    label: "Analisa Market",
    icon: LineChart,
    links: [
      { href: "/signals", label: "Signals & Track Record", icon: LineChart },
      { href: "/positioning", label: "Positioning", icon: Compass },
    ],
  },
  {
    label: "Trading Tools",
    icon: NotebookText,
    links: [
      { href: "/trades", label: "Journal", icon: NotebookText },
      { href: "/reports", label: "Report & Performance", icon: BarChart3 },
      { href: "/calculator", label: "Lot Calculator", icon: Calculator },
      { href: "/news", label: "Economic News", icon: Newspaper },
    ],
  },
  {
    label: "Academy",
    icon: GraduationCap,
    links: [
      { href: "/academy/technical", label: "Belajar Teknikal", icon: GraduationCap },
      { href: "/academy/fundamental", label: "Fundamental Forex", icon: GraduationCap },
      { href: "/academy/psychology", label: "Psikologi & Risk", icon: GraduationCap },
    ],
  },
];

const bottomLinks = [{ href: "/settings", label: "Settings", icon: Settings }];

export function Sidebar({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "Analisa Market": true,
    "Trading Tools": true,
    Academy: true,
    Admin: false,
  });

  function toggleGroup(label: string) {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  function linkClass(active: boolean) {
    return cx(
      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-body-sm font-medium transition-colors",
      active
        ? "bg-primary-subtle text-primary"
        : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
    );
  }

  const brand = (
    <div className="flex items-center gap-2.5">
      <Image src="/logo.png" alt="Loki4x" width={32} height={32} className="rounded-full" />
      <span className="text-body font-display font-extrabold tracking-wide text-text-primary">
        LOKI4X TRADER
      </span>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-topbar items-center justify-between border-b border-border bg-surface px-4 lg:hidden">
        <button onClick={() => setMobileOpen(true)} className="text-text-primary" aria-label="Open menu">
          <Menu className="h-6 w-6" />
        </button>
        <Link href="/settings" className="text-text-primary" aria-label="Profile & Settings">
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
          <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
            {brand}
          </Link>
          <button onClick={() => setMobileOpen(false)} className="text-text-muted lg:hidden" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {topLinks.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={linkClass(pathname === href)}>
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}

          {groups.map((group) => {
            const isOpen = openGroups[group.label];
            const groupActive = group.links.some((l) => pathname.startsWith(l.href));
            return (
              <div key={group.label} className="mt-2">
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={cx(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-caption font-bold uppercase tracking-wide",
                    groupActive ? "text-primary" : "text-text-muted"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <group.icon className="h-3.5 w-3.5" />
                    {group.label}
                  </span>
                  <ChevronDown className={cx("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
                </button>
                {isOpen && (
                  <div className="flex flex-col gap-1 pl-2">
                    {group.links.map(({ href, label, icon: Icon }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setMobileOpen(false)}
                        className={linkClass(pathname.startsWith(href))}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="my-2 border-t border-border" />

          {bottomLinks.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={linkClass(pathname === href)}>
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}

          {isAdmin && (
            <div className="mt-2">
              <button
                onClick={() => toggleGroup("Admin")}
                className={cx(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-caption font-bold uppercase tracking-wide",
                  pathname.startsWith("/admin") ? "text-primary" : "text-text-muted"
                )}
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Admin
                </span>
                <ChevronDown className={cx("h-3.5 w-3.5 transition-transform", openGroups.Admin && "rotate-180")} />
              </button>
              {openGroups.Admin && (
                <div className="flex flex-col gap-1 pl-2">
                  <Link
                    href="/admin"
                    onClick={() => setMobileOpen(false)}
                    className={linkClass(pathname.startsWith("/admin"))}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Admin Panel
                  </Link>
                </div>
              )}
            </div>
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
