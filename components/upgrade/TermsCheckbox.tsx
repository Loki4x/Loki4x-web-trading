"use client";

import { useT } from "@/lib/i18n/client";

/** Checkbox persetujuan S&K dengan link ke bagian terkait di halaman /terms (dibuka di tab baru). */
export function TermsCheckbox({
  checked,
  onChange,
  anchor,
  name,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  anchor: "paket-berbayar" | "vip-ib";
  name?: string;
}) {
  const t = useT();
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-body-sm text-text-secondary">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
      />
      <span>
        {t("Saya sudah membaca dan menyetujui")}{" "}
        <a
          href={`/terms#${anchor}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-primary underline underline-offset-2"
        >
          {t("Syarat & Ketentuan")}
        </a>
        .
      </span>
    </label>
  );
}
