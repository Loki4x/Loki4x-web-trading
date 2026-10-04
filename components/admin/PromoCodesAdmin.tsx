"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createPromoCode, setPromoActive } from "@/app/admin/actions";
import { useLocale, useT } from "@/lib/i18n/client";
import { dateLocale } from "@/lib/i18n/dictionary";
import { cx } from "@/lib/utils";

export interface PromoAdminRow {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED_IDR";
  value: number;
  max_uses: number | null;
  used_count: number;
  valid_from: string | null;
  valid_until: string | null;
  plans: string[] | null;
  active: boolean;
  note: string | null;
}

const PLAN_OPTIONS: { value: string; label: string }[] = [
  { value: "VIP", label: "VIP" },
  { value: "MEMBERSHIP", label: "Membership" },
  { value: "MEMBERSHIP_LIFETIME", label: "Membership Lifetime" },
];

export function PromoCodesAdmin({ rows }: { rows: PromoAdminRow[] }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [type, setType] = useState<"PERCENT" | "FIXED_IDR">("PERCENT");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  const fmt = new Intl.DateTimeFormat(dateLocale(locale), { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const formData = new FormData(e.currentTarget);
    formData.set("type", type);
    setPending(true);
    setError(null);
    const result = await createPromoCode(formData);
    setPending(false);
    if (!result.ok) {
      setError(result.message ?? t("Terjadi kesalahan."));
      return;
    }
    setFormKey((k) => k + 1); // kosongkan form
    router.refresh();
  }

  async function toggle(row: PromoAdminRow) {
    await setPromoActive(row.id, !row.active);
    router.refresh();
  }

  const valueLabel = (r: PromoAdminRow) =>
    r.type === "PERCENT" ? `${Number(r.value)}%` : `Rp${Number(r.value).toLocaleString("id-ID")}`;

  return (
    <div className="flex flex-col gap-6">
      <form key={formKey} onSubmit={handleSubmit} className="card flex flex-col gap-4">
        <h2 className="text-h3 text-text-primary">{t("Buat Kode Promo")}</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input name="code" label={t("Kode")} placeholder="HEMAT20" maxLength={32} required style={{ textTransform: "uppercase" }} />

          <div className="flex flex-col gap-2">
            <label className="text-body-sm font-medium text-text-secondary">{t("Jenis diskon")}</label>
            <select value={type} onChange={(e) => setType(e.target.value as "PERCENT" | "FIXED_IDR")} className="input-field">
              <option value="PERCENT">{t("Persen (%)")}</option>
              <option value="FIXED_IDR">{t("Potongan nominal (Rp)")}</option>
            </select>
          </div>

          <Input
            name="value"
            type="number"
            step={type === "PERCENT" ? "0.01" : "1000"}
            label={type === "PERCENT" ? t("Diskon (1–95%)") : t("Potongan (Rp)")}
            required
          />
          <Input name="max_uses" type="number" min="1" step="1" label={t("Batas pemakaian (kosong = tanpa batas)")} />
          <Input name="valid_from" type="date" label={t("Mulai berlaku (opsional)")} />
          <Input name="valid_until" type="date" label={t("Berlaku sampai (opsional)")} />
        </div>

        <div>
          <p className="text-body-sm font-medium text-text-secondary">{t("Berlaku untuk paket (kosong = semua)")}</p>
          <div className="mt-2 flex flex-wrap gap-4">
            {PLAN_OPTIONS.map((p) => (
              <label key={p.value} className="flex items-center gap-2 text-body-sm text-text-secondary">
                <input type="checkbox" name="plans" value={p.value} className="h-4 w-4" />
                {p.label}
              </label>
            ))}
          </div>
        </div>

        <Input name="note" label={t("Catatan internal (opsional)")} maxLength={200} />

        {error && <p className="rounded-lg border border-error/30 bg-error-subtle px-3 py-2 text-body-sm text-error">{error}</p>}

        <div>
          <Button type="submit" loading={pending}>
            {t("Buat Kode")}
          </Button>
        </div>
        <p className="text-caption text-text-muted">
          {t("Tiap user hanya bisa memakai satu kode sekali. Pemakaian dihitung saat pembayaran selesai.")}
        </p>
      </form>

      <div className="card overflow-x-auto !p-0">
        <table className="w-full min-w-[820px] border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface text-left">
              {["Kode", "Diskon", "Dipakai", "Masa berlaku", "Paket", "Status"].map((h) => (
                <th key={h} className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-secondary">
                  {t(h)}
                </th>
              ))}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-body-sm text-text-muted">
                  {t("Belum ada kode promo.")}
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                <td className="px-4 py-3">
                  <p className="text-body-sm font-semibold text-text-primary">{r.code}</p>
                  {r.note && <p className="text-caption text-text-muted">{r.note}</p>}
                </td>
                <td className="px-4 py-3 text-body-sm text-text-primary">{valueLabel(r)}</td>
                <td className="tabular-nums px-4 py-3 text-body-sm text-text-secondary">
                  {r.used_count}
                  {r.max_uses !== null ? ` / ${r.max_uses}` : ""}
                </td>
                <td className="px-4 py-3 text-caption text-text-secondary">
                  {r.valid_from ? fmt.format(new Date(r.valid_from)) : "—"} → {r.valid_until ? fmt.format(new Date(r.valid_until)) : "∞"}
                </td>
                <td className="px-4 py-3 text-caption text-text-secondary">{r.plans && r.plans.length > 0 ? r.plans.join(", ") : t("Semua")}</td>
                <td className={cx("px-4 py-3 text-body-sm font-semibold", r.active ? "text-success" : "text-text-muted")}>
                  {r.active ? t("Aktif") : t("Nonaktif")}
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => toggle(r)} className="text-body-sm font-medium text-primary hover:underline">
                    {r.active ? t("Nonaktifkan") : t("Aktifkan")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
