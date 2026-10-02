"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { addSignal } from "@/app/admin/actions";
import { nowWibInputValue } from "@/lib/utils";
import { SIGNAL_STATUS_LABEL } from "@/lib/signal-metrics";
import type { SignalStatus } from "@/lib/types";
import { useT } from "@/lib/i18n/client";

const STATUS_OPTIONS: SignalStatus[] = ["OPEN", "HIT_ENTRY", "TP", "SL", "PARTIAL", "CANCEL", "MISS"];
const TERMINAL: SignalStatus[] = ["TP", "SL", "PARTIAL", "CANCEL", "MISS"];
const NEEDS_RESULT: SignalStatus[] = ["TP", "SL", "PARTIAL"];

type Intent = "close" | "again";

export function AddSignalModal({ onClose }: { onClose: () => void }) {
  const t = useT();
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const intentRef = useRef<Intent>("close");

  // formKey dinaikkan setelah "Simpan & Tambah Lagi" supaya isian (yang uncontrolled)
  // kosong lagi; tanggal sinyal sengaja dipertahankan biar input beruntun lebih cepat.
  const [formKey, setFormKey] = useState(0);
  const [status, setStatus] = useState<SignalStatus>("OPEN");
  const [postedAt, setPostedAt] = useState(() => nowWibInputValue());
  const [pending, setPending] = useState<Intent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const isTerminal = TERMINAL.includes(status);
  const needsResult = NEEDS_RESULT.includes(status);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;

    const intent = intentRef.current;
    const formData = new FormData(e.currentTarget);
    const label = `${String(formData.get("symbol") ?? "").toUpperCase()} ${String(formData.get("side") ?? "")}`;

    setPending(intent);
    setError(null);
    setSaved(null);

    const result = await addSignal(formData);
    setPending(null);

    if (!result.ok) {
      setError(result.message ?? "Gagal menyimpan sinyal.");
      return;
    }

    router.refresh();
    if (intent === "again") {
      setFormKey((k) => k + 1);
      setStatus("OPEN");
      setSaved(`Tersimpan: ${label}`);
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div ref={scrollRef} className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-surface p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-h3 text-text-primary">Post Signal</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary" aria-label={t("Tutup")}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {saved && (
          <p className="mb-4 rounded-lg border border-success/30 bg-success-subtle px-3 py-2 text-body-sm text-success">
            {saved}{t(". Form dikosongkan untuk sinyal berikutnya.")}
          </p>
        )}

        <form key={formKey} onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input name="symbol" label="Symbol" placeholder="XAUUSD" required />

          <div className="flex flex-col gap-2">
            <label className="text-body-sm font-medium text-text-secondary">Side</label>
            <select name="side" required className="input-field" defaultValue="BUY">
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </select>
          </div>

          <div>
            <Input
              name="posted_at"
              type="datetime-local"
              label={t("Tanggal & jam sinyal (WIB)")}
              value={postedAt}
              onChange={(e) => setPostedAt(e.target.value)}
              required
            />
            <p className="mt-1.5 text-caption text-text-muted">
              {t("Default sekarang. Ubah untuk memasukkan sinyal lama sesuai tanggal aslinya.")}
            </p>
          </div>

          <Input name="entry_price" type="number" step="0.00001" label="Entry Price" required />

          <div>
            <div className="grid grid-cols-2 gap-4">
              <Input name="take_profit" type="number" step="0.00001" label="Take Profit (optional)" />
              <Input name="stop_loss" type="number" step="0.00001" label="Stop Loss (optional)" />
            </div>
            <p className="mt-1.5 text-caption text-text-muted">
              {t("Isi Stop Loss supaya sinyal ini ikut dihitung di grafik pertumbuhan & drawdown.")}
            </p>
          </div>

          <Input
            name="risk_percent"
            type="number"
            step="0.1"
            label="Risk % per trade"
            placeholder="2"
            defaultValue={2}
          />

          <div>
            <div className="flex flex-col gap-2">
              <label className="text-body-sm font-medium text-text-secondary">Status</label>
              <select
                name="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as SignalStatus)}
                className="input-field"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {SIGNAL_STATUS_LABEL[opt]}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-1.5 text-caption text-text-muted">
              {t("Memasukkan sinyal lama? Pilih status akhirnya (TP/SL/dst), lalu isi tanggal ditutup.")}
            </p>
          </div>

          {isTerminal && (
            <>
              {needsResult && (
                <>
                  <Input
                    name="closing_price"
                    type="number"
                    step="0.00001"
                    label={status === "PARTIAL" ? t("Harga Penutupan") : t("Harga Penutupan (opsional)")}
                    placeholder={
                      status === "TP"
                        ? t("Kosong = pakai Take Profit")
                        : status === "SL"
                          ? t("Kosong = pakai Stop Loss")
                          : ""
                    }
                    required={status === "PARTIAL"}
                  />
                  <Input
                    name="result_pips"
                    type="number"
                    step="0.1"
                    label={t("Hasil (pips, boleh minus untuk loss)")}
                    placeholder={t("e.g. 25 atau -10")}
                  />
                </>
              )}
              <div>
                <Input name="closed_at" type="datetime-local" label={t("Tanggal & jam ditutup (WIB)")} />
                <p className="mt-1.5 text-caption text-text-muted">{t("Kosongkan = sama dengan tanggal sinyal.")}</p>
              </div>
            </>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-body-sm font-medium text-text-secondary">{t("Chart Screenshot / Analisa (optional)")}</label>
            <input
              name="chart_image"
              type="file"
              accept="image/*"
              className="input-field file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-caption file:font-semibold file:text-text-on-primary"
            />
            <p className="text-caption text-text-muted">
              {t("Screenshot chart/analisa ini akan ditampilkan ke user lain sebagai alasan sinyal.")}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-body-sm font-medium text-text-secondary">{t("Notes / Alasan Sinyal (optional)")}</label>
            <textarea name="notes" rows={3} className="input-field resize-none" placeholder={t("Alasan/setup sinyal...")} />
          </div>

          {error && (
            <p className="rounded-lg border border-error/30 bg-error-subtle px-3 py-2 text-body-sm text-error">{error}</p>
          )}

          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Button
              type="submit"
              withArrow
              loading={pending === "close"}
              disabled={pending !== null}
              onClick={() => (intentRef.current = "close")}
              className="w-full justify-center"
            >
              {t("Simpan")}
            </Button>
            <Button
              type="submit"
              variant="secondary"
              loading={pending === "again"}
              disabled={pending !== null}
              onClick={() => (intentRef.current = "again")}
              className="w-full justify-center"
            >
              {t("Simpan & Tambah Lagi")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
