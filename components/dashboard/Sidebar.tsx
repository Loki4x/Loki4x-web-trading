"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  NotebookText,
  Newspaper,
  Globe,
  BarChart3,
  LogOut,
  ShieldCheck,
  Crown,
  Menu,
  X,
  ChevronDown,
  LineChart,
  Landmark,
  Compass,
  Calculator,
  GraduationCap,
  CircleUserRound,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { cx } from "@/lib/utils";
import { signOut } from "@/app/(dashboard)/actions";
import type { TradingAccount } from "@/lib/types";
import { useT } from "@/lib/i18n/client";
import type { DictKey } from "@/lib/i18n/dictionary";

const topLinks: { href: string; key: DictKey; icon: typeof LayoutDashboard }[] = [
  { href: "/dashboard", key: "nav.dashboard", icon: LayoutDashboard },
  { href: "/upgrade", key: "nav.upgrade", icon: Crown },
];

const groups: {
  id: string;
  key: DictKey;
  icon: typeof LineChart;
  links: { href: string; key: DictKey; icon: typeof LineChart }[];
}[] = [
  {
    id: "market",
    key: "nav.group.market",
    icon: LineChart,
    links: [
      { href: "/signals", key: "nav.signals", icon: LineChart },
      { href: "/cot", key: "nav.cot", icon: Landmark },
      { href: "/positioning", key: "nav.retail", icon: Compass },
    ],
  },
  {
    id: "tools",
    key: "nav.group.tools",
    icon: NotebookText,
    links: [
      { href: "/trades", key: "nav.journal", icon: NotebookText },
      { href: "/reports", key: "nav.reports", icon: BarChart3 },
      { href: "/calculator", key: "nav.calculator", icon: Calculator },
      { href: "/news", key: "nav.news", icon: Newspaper },
      { href: "/market-news", key: "nav.fundamental", icon: Globe },
    ],
  },
  {
    id: "academy",
    key: "nav.group.academy",
    icon: GraduationCap,
    links: [
      { href: "/academy/technical", key: "nav.technical", icon: GraduationCap },
      { href: "/academy/fundamental", key: "nav.fxFundamental", icon: GraduationCap },
      { href: "/academy/psychology", key: "nav.psychology", icon: GraduationCap },
    ],
  },
];

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export function Sidebar({
  isAdmin,
  notifications = [],
  desktopOpen,
  onToggleDesktop,
}: {
  isAdmin?: boolean;
  notifications?: NotificationItem[];
  desktopOpen: boolean;
  onToggleDesktop: () => void;
}) {
  const t = useT();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    market: true,
    tools: true,
    academy: true,
    Admin: false,
  });

  function toggleGroup(label: string) {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  function linkClass(active: boolean) {
    return cx(
      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[11px] font-medium transition-colors",
      active
        ? "bg-primary-subtle text-primary"
        : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
    );
  }

  const brand = (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary p-1">
        <Image src="/logo-white.png" alt="Loki4x Academy" width={24} height={24} className="h-full w-full object-contain" />
      </div>
      <span className="text-body-sm font-display font-extrabold tracking-wide text-text-primary">
        LOKI4X ACADEMY
      </span>
    </div>
  );

  return (
    <>
      {/* Top bar - persistent across mobile and desktop */}
      <div
        className={cx(
          "fixed inset-x-0 top-0 z-30 flex h-topbar items-center justify-between border-b border-border bg-surface px-4 transition-[padding] duration-200",
          desktopOpen ? "lg:pl-sidebar" : "lg:pl-0"
        )}
      >
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileOpen(true)} className="text-text-primary lg:hidden" aria-label={t("nav.openMenu")}>
            <Menu className="h-6 w-6" />
          </button>
          {!desktopOpen && (
            <button
              onClick={onToggleDesktop}
              className="hidden text-text-muted transition-colors hover:text-text-primary lg:block"
              aria-label={t("nav.showSidebar")}
            >
              <PanelLeft className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-4">
          <NotificationBell notifications={notifications} />

          <div className="relative">
            <button
              onClick={() => setProfileOpen((prev) => !prev)}
              className="text-text-primary"
              aria-label="Profile & Settings"
            >
              <CircleUserRound className="h-6 w-6" />
            </button>

            {profileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-border bg-surface p-2 shadow-lg">
                  <Link
                    href="/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[11px] font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
                  >
                    <CircleUserRound className="h-4 w-4" />
                    {t("nav.settings")}
                  </Link>
                  <form action={signOut}>
                    <button
                      type="submit"
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[11px] font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-error"
                    >
                      <LogOut className="h-4 w-4" />
                      {t("nav.logout")}
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-50 flex w-sidebar flex-col overflow-y-auto border-r border-border bg-surface px-4 py-6 transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          desktopOpen ? "lg:translate-x-0" : "lg:-translate-x-full"
        )}
      >
        <div className="mb-8 flex items-center justify-between px-1">
          <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
            {brand}
          </Link>
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleDesktop}
              className="hidden text-text-muted transition-colors hover:text-text-primary lg:block"
              aria-label={t("nav.hideSidebar")}
            >
              <PanelLeftClose className="h-5 w-5" />
            </button>
            <button onClick={() => setMobileOpen(false)} className="text-text-muted lg:hidden" aria-label={t("nav.closeMenu")}>
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {topLinks.map(({ href, key, icon: Icon }) => (
            <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={linkClass(pathname === href)}>
              <Icon className="h-4 w-4" />
              {t(key)}
            </Link>
          ))}

          {groups.map((group) => {
            const isOpen = openGroups[group.id];
            const groupActive = group.links.some((l) => pathname.startsWith(l.href));
            return (
              <div key={group.id} className="mt-2">
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={cx(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-[11px] font-medium uppercase tracking-wide",
                    groupActive ? "text-primary" : "text-text-muted"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <group.icon className="h-3.5 w-3.5" />
                    {t(group.key)}
                  </span>
                  <ChevronDown className={cx("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
                </button>
                {isOpen && (
                  <div className="flex flex-col gap-1 pl-2">
                    {group.links.map(({ href, key, icon: Icon }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setMobileOpen(false)}
                        className={linkClass(pathname.startsWith(href))}
                      >
                        <Icon className="h-4 w-4" />
                        {t(key)}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {isAdmin && (
            <>
              <div className="my-2 border-t border-border" />
              <div className="mt-2">
              <button
                onClick={() => toggleGroup("Admin")}
                className={cx(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-[11px] font-medium uppercase tracking-wide",
                  pathname.startsWith("/admin") ? "text-primary" : "text-text-muted"
                )}
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {t("nav.admin")}
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
                    {t("nav.adminPanel")}
                  </Link>
                </div>
              )}
            </div>
            </>
          )}
        </nav>
      </aside>
    </>
  );
}
