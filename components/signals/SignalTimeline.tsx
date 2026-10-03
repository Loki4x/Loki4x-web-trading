"use client";

import { ArrowRightLeft, CircleDot, MessageSquare, Scissors, ShieldCheck, Target } from "lucide-react";
import { useLocale, useT } from "@/lib/i18n/client";
import { dateLocale } from "@/lib/i18n/dictionary";
import type { SignalUpdate, SignalUpdateType } from "@/lib/types";

export const SIGNAL_UPDATE_LABEL: Record<SignalUpdateType, string> = {
  SL_TO_BE: "SL digeser ke BE",
  PARTIAL_CLOSE: "Partial close",
  MOVE_SL: "Geser Stop Loss",
  MOVE_TP: "Geser Take Profit",
  NOTE: "Catatan",
};

const ICON: Record<SignalUpdateType, typeof CircleDot> = {
  SL_TO_BE: ShieldCheck,
  PARTIAL_CLOSE: Scissors,
  MOVE_SL: ArrowRightLeft,
  MOVE_TP: Target,
  NOTE: MessageSquare,
};

export function SignalTimeline({ updates }: { updates: SignalUpdate[] }) {
  const t = useT();
  const locale = useLocale();
  if (updates.length === 0) return null;

  const fmt = new Intl.DateTimeFormat(dateLocale(locale), {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  });

  return (
    <div className="mt-5 border-t border-border pt-4">
      <p className="mb-3 text-caption font-semibold uppercase tracking-wide text-text-secondary">{t("Timeline Update")}</p>
      <ol className="flex flex-col gap-4 border-l border-border pl-4">
        {updates.map((u) => {
          const Icon = ICON[u.type] ?? CircleDot;
          return (
            <li key={u.id} className="relative">
              <span className="absolute -left-[25px] flex h-5 w-5 items-center justify-center rounded-full bg-surface-2 text-primary">
                <Icon className="h-3 w-3" />
              </span>
              <p className="text-body-sm font-semibold text-text-primary">
                {t(SIGNAL_UPDATE_LABEL[u.type] ?? "Catatan")}
                {u.price !== null && <span className="ml-2 tabular-nums text-text-secondary">@ {u.price}</span>}
              </p>
              {u.message && <p className="whitespace-pre-wrap text-body-sm text-text-secondary">{u.message}</p>}
              <p className="text-caption text-text-muted">{fmt.format(new Date(u.created_at))} WIB</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
