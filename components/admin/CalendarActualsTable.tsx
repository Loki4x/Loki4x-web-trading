"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { NewsImpactBadge } from "@/components/news/NewsImpactBadge";
import { saveCalendarActual } from "@/app/admin/actions";
import { useLocale, useT } from "@/lib/i18n/client";
import { dateLocale } from "@/lib/i18n/dictionary";

export interface ActualRow {
  key: string;
  dateISO: string;
  currency: string;
  impact: "HIGH" | "MEDIUM";
  title: string;
  forecast: string;
  previous: string;
  actual: string;
}

type Status = "idle" | "saving" | "saved" | "error";

export function CalendarActualsTable({ rows }: { rows: ActualRow[] }) {
  const t = useT();
  const locale = useLocale();
  const [highOnly, setHighOnly] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(rows.map((r) => [r.key, r.actual])));
  const [saved, setSaved] = useState<Record<string, string>>(() => Object.fromEntries(rows.map((r) => [r.key, r.actual])));
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fmt = new Intl.DateTimeFormat(dateLocale(locale), {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  });

  async function save(row: ActualRow) {
    const value = (values[row.key] ?? "").trim();
    setStatus((s) => ({ ...s, [row.key]: "saving" }));
    const result = await saveCalendarActual(row.key, value);
    if (!result.ok) {
      setStatus((s) => ({ ...s, [row.key]: "error" }));
      setErrors((e) => ({ ...e, [row.key]: result.message ?? t("Terjadi kesalahan.") }));
      return;
    }
    setSaved((s) => ({ ...s, [row.key]: value }));
    setStatus((s) => ({ ...s, [row.key]: "saved" }));
  }

  const visible = rows.filter((r) => !highOnly || r.impact === "HIGH");

  return (
    <div>
      <label className="mb-4 flex items-center gap-2 text-body-sm text-text-secondary">
        <input type="checkbox" checked={highOnly} onChange={(e) => setHighOnly(e.target.checked)} className="h-4 w-4" />
        {t("Hanya High impact")}
      </label>

      <div className="flex flex-col gap-3">
        {visible.length === 0 && (
          <div className="card text-center text-body-sm text-text-muted">{t("Tidak ada berita untuk diisi.")}</div>
        )}

        {visible.map((r) => {
          const released = new Date(r.dateISO).getTime() <= Date.now();
          const dirty = (values[r.key] ?? "").trim() !== (saved[r.key] ?? "");
          const st = status[r.key] ?? "idle";
          return (
            <div key={r.key} className="card !p-4">
              <div className="flex flex-wrap items-center gap-2">
                <NewsImpactBadge impact={r.impact} />
                <span className="text-body-sm font-semibold text-text-primary">{r.currency}</span>
                <span className="text-caption text-text-muted">{fmt.format(new Date(r.dateISO))} WIB</span>
                {released && !saved[r.key] && (
                  <span className="rounded-sm bg-warning-subtle px-1.5 py-0.5 text-badge font-semibold text-warning">
                    {t("Perlu diisi")}
                  </span>
                )}
              </div>
              <p className="mt-1 text-body-sm text-text-primary">{r.title}</p>
              <p className="text-caption text-text-muted">
                {t("Forecast")}: {r.forecast || "—"} · {t("Previous")}: {r.previous || "—"}
              </p>

              <div className="mt-3 flex items-center gap-2">
                <input
                  value={values[r.key] ?? ""}
                  onChange={(e) => {
                    setValues((v) => ({ ...v, [r.key]: e.target.value }));
                    setStatus((s) => ({ ...s, [r.key]: "idle" }));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && dirty) save(r);
                  }}
                  maxLength={40}
                  placeholder={t("Actual, mis. 3.2% atau 250K")}
                  className="input-field flex-1"
                  inputMode="text"
                />
                <button onClick={() => save(r)} disabled={!dirty || st === "saving"} className="btn-primary shrink-0 text-body-sm">
                  {st === "saving" ? t("common.saving") : t("Simpan")}
                </button>
                {st === "saved" && !dirty && <Check className="h-5 w-5 shrink-0 text-success" aria-label={t("Tersimpan")} />}
              </div>
              {st === "error" && errors[r.key] && <p className="mt-2 text-caption text-error">{errors[r.key]}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
