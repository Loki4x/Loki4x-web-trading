"use client";

import { useState, type ReactNode } from "react";
import { cx } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";

type TabKey = "widget" | "schedule";

/**
 * Dua tampilan kalender: widget Myfxbook (ada Actual) dan jadwal bawaan (WIB, filter).
 * Keduanya tetap terpasang (hanya disembunyikan) supaya filter tidak reset saat pindah tab,
 * dan iframe widget baru dimuat saat tab-nya dibuka (loading="lazy").
 */
export function NewsCalendarTabs({ widget, schedule }: { widget: ReactNode; schedule: ReactNode }) {
  const t = useT();
  const [tab, setTab] = useState<TabKey>("widget");

  const tabs: { key: TabKey; label: string }[] = [
    { key: "widget", label: t("Kalender & Hasil Rilis") },
    { key: "schedule", label: t("Jadwal (WIB)") },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={cx(
              "rounded-full px-3 py-1.5 text-body-sm font-semibold transition-colors",
              tab === item.key ? "bg-primary text-text-on-primary" : "bg-surface-2 text-text-secondary hover:bg-surface-hover"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div hidden={tab !== "widget"}>{widget}</div>
      <div hidden={tab !== "schedule"}>{schedule}</div>
    </div>
  );
}
