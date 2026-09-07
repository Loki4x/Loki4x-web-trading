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

        <nav class
