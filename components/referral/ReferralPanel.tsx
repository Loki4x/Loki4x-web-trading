"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { useT } from "@/lib/i18n/client";

export function ReferralPanel({ link, code }: { link: string; code: string }) {
  const t = useT();
  const [copied, setCopied] = useState<"link" | "code" | null>(null);

  async function copy(kind: "link" | "code") {
    try {
      await navigator.clipboard.writeText(kind === "link" ? link : code);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard tidak tersedia: abaikan */
    }
  }

  const shareText = t("Gabung Loki4x Academy lewat link undanganku: {link}", { link });

  return (
    <div className="card">
      <p className="text-body-sm font-medium text-text-secondary">{t("Link undanganmu")}</p>
      <div className="mt-2 flex items-center gap-2">
        <input readOnly value={link} className="input-field flex-1 text-body-sm" onFocus={(e) => e.currentTarget.select()} />
        <button
          type="button"
          onClick={() => copy("link")}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-body-sm font-semibold text-text-secondary hover:bg-surface-hover"
        >
          {copied === "link" ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
          {copied === "link" ? t("Tersalin") : t("Copy")}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary flex items-center gap-2 text-body-sm"
        >
          <Share2 className="h-4 w-4" />
          {t("Bagikan lewat WhatsApp")}
        </a>
        <p className="text-caption text-text-muted">
          {t("Kode referral")}:{" "}
          <button type="button" onClick={() => copy("code")} className="font-semibold text-text-primary hover:underline">
            {code}
          </button>
          {copied === "code" && <span className="ml-1 text-success">{t("Tersalin")}</span>}
        </p>
      </div>
    </div>
  );
}
