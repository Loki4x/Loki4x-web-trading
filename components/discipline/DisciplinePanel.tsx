"use client";

import { useState } from "react";
import { AlertTriangle, Flame, OctagonX, Settings2, ShieldCheck, Target } from "lucide-react";
import { cx, formatCurrency, formatPlainCurrency } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n/client";
import { dateLocale } from "@/lib/i18n/dictionary";
import type { DisciplineSummary, RuleLevel, RuleStatus } from "@/lib/discipline";
import type { TradingAccount } from "@/lib/types";
import { RiskGoalsModal } from "@/components/discipline/RiskGoalsModal";

const BAR: Record<RuleLevel, string> = { ok: "bg-success", warn: "bg-warning", breached: "bg-error" };
const TEXT: Record<RuleLevel, string> = { ok: "text-success", warn: "text-warning", breached: "text-error" };

function Bar({ percent, className }: { percent: number; className: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-surface-2">
      <div
        className={cx("h-full rounded-full transition-all", className)}
        style={{ width: `${Math.max(percent > 0 ? 3 : 0, Math.min(100, percent))}%` }}
      />
    </div>
  );
}

export function DisciplinePanel({ summary, account }: { summary: DisciplineSummary; account: TradingAccount }) {
  const t = useT();
  const locale = useLocale();
  const [editing, setEditing] = useState(false);
  const cur = account.currency;

  const ruleLabel = (r: RuleStatus) => {
    switch (r.key) {
      case "daily_loss":
        return { label: t("Rugi hari ini"), value: `${r.current.toFixed(1)}% / ${r.limit}%` };
      case "trades_per_day":
        return { label: t("Trade hari ini"), value: `${r.current} / ${r.limit}` };
      case "consecutive_losses":
        return { label: t("Loss beruntun hari ini"), value: `${r.current} / ${r.limit}` };
    }
  };

  const monthLabel = new Date(`${summary.month}-01T00:00:00`).toLocaleDateString(dateLocale(locale), {
    month: "long",
    year: "numeric",
  });

  const empty = !summary.hasRules && !summary.hasGoals;

  return (
    <div className="card">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-body font-semibold text-text-primary">
            <ShieldCheck className="h-4 w-4 text-primary" />
            {t("Disiplin & Target")}
          </h3>
          <p className="text-caption text-text-muted">{t("Akun: {name}", { name: account.name })}</p>
        </div>
        <button onClick={() => setEditing(true)} className="btn-secondary px-3 py-1.5 text-caption">
          <Settings2 className="h-3.5 w-3.5" />
          {t("Atur")}
        </button>
      </div>

      {empty ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-center">
          <p className="mb-1 text-body-sm font-medium text-text-primary">{t("Belum ada aturan risiko & target")}</p>
          <p className="mb-3 text-caption text-text-muted">
            {t("Pasang batas rugi harian, batas jumlah trade, dan target bulanan supaya trading lebih disiplin.")}
          </p>
          <button onClick={() => setEditing(true)} className="btn-primary px-4 py-2 text-body-sm">
            {t("Atur sekarang")}
          </button>
        </div>
      ) : (
        <>
          {summary.overall === "breached" && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-error-subtle px-3 py-2.5 text-body-sm font-medium text-error">
              <OctagonX className="mt-0.5 h-4 w-4 shrink-0" />
              {t("Batas hari ini sudah tercapai. Sebaiknya berhenti trading dan lanjut besok.")}
            </div>
          )}
          {summary.overall === "warn" && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-warning-subtle px-3 py-2.5 text-body-sm font-medium text-warning">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {t("Hampir mencapai batas hari ini. Lebih selektif ya.")}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <p className="mb-3 text-caption font-semibold uppercase tracking-wide text-text-muted">{t("Aturan hari ini")}</p>
              {summary.rules.length === 0 ? (
                <p className="text-body-sm text-text-muted">{t("Belum ada aturan risiko.")}</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {summary.rules.map((r) => {
                    const { label, value } = ruleLabel(r);
                    return (
                      <div key={r.key}>
                        <div className="mb-1 flex items-center justify-between text-body-sm">
                          <span className="text-text-secondary">{label}</span>
                          <span className={cx("font-semibold tabular-nums", TEXT[r.level])}>{value}</span>
                        </div>
                        <Bar percent={(r.current / r.limit) * 100} className={BAR[r.level]} />
                      </div>
                    );
                  })}
                  <p className="text-caption text-text-muted">
                    {t("P&L hari ini:")}{" "}
                    <span className={cx("font-semibold", summary.todayPnl >= 0 ? "text-success" : "text-error")}>
                      {formatCurrency(summary.todayPnl, cur)}
                    </span>
                  </p>
                </div>
              )}
            </div>

            <div>
              <p className="mb-3 text-caption font-semibold uppercase tracking-wide text-text-muted">
                {t("Target {month}", { month: monthLabel })}
              </p>
              <div className="flex flex-col gap-3">
                {summary.profitGoal && (
                  <div>
                    <div className="mb-1 flex items-center justify-between text-body-sm">
                      <span className="flex items-center gap-1.5 text-text-secondary">
                        <Target className="h-3.5 w-3.5" />
                        {t("Profit")}
                      </span>
                      <span className="font-semibold tabular-nums text-text-primary">
                        {formatCurrency(summary.profitGoal.current, cur)}{" "}
                        <span className="font-normal text-text-muted">/ {formatPlainCurrency(summary.profitGoal.target, cur)}</span>
                      </span>
                    </div>
                    <Bar percent={summary.profitGoal.percent} className={summary.profitGoal.reached ? "bg-success" : "bg-primary"} />
                  </div>
                )}
                {summary.winRateGoal && (
                  <div>
                    <div className="mb-1 flex items-center justify-between text-body-sm">
                      <span className="text-text-secondary">
                        {t("Win rate")} <span className="text-text-muted">({summary.monthClosedTrades} trade)</span>
                      </span>
                      <span className="font-semibold tabular-nums text-text-primary">
                        {summary.winRateGoal.current.toFixed(0)}%{" "}
                        <span className="font-normal text-text-muted">/ {summary.winRateGoal.target}%</span>
                      </span>
                    </div>
                    <Bar percent={summary.winRateGoal.percent} className={summary.winRateGoal.reached ? "bg-success" : "bg-primary"} />
                  </div>
                )}
                {!summary.hasGoals && <p className="text-body-sm text-text-muted">{t("Belum ada target bulanan.")}</p>}

                <div className="flex items-center gap-3 rounded-lg bg-surface-2/60 px-3 py-2.5">
                  <Flame className={cx("h-5 w-5", summary.streak > 0 ? "text-warning" : "text-text-muted")} />
                  <div>
                    <p className="text-body-sm font-semibold text-text-primary">
                      {t("{n} hari disiplin beruntun", { n: summary.streak })}
                    </p>
                    <p className="text-caption text-text-muted">
                      {t("Rekor: {n} hari · sesuai rencana & tidak melanggar aturan", { n: summary.bestStreak })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {editing && <RiskGoalsModal account={account} onClose={() => setEditing(false)} />}
    </div>
  );
}
