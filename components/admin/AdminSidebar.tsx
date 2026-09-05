"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, ArrowLeft } from "lucide-react";
import { cx } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-sidebar flex-col border-r border-border bg-surface px-4 py-6 lg:flex">
      <Link href="/admin" className="mb-8 flex items-center gap-2 px-2">
        <span className="text-h3 font-display font-extrabold text-text-primary">
          Loki<span className="text-primary">4x</span>
        </span>
        <span className="rounded-md bg-primary/15 px-2 py-0.5 text-caption font-bold text-primary">
          ADMIN
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
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
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-body-sm font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to App
      </Link>
    </aside>
  );
}
