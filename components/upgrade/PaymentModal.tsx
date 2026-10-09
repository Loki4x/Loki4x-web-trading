"use client";

import { compressImageFile } from "@/lib/compress-image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Copy, Check, Upload, Loader2 } from "lucide-react";
import { cx } from "@/lib/utils";
import {
  createInstantPayment,
  checkInstantPaymentStatus,
  submitUsdtPayment,
  previewPromoCode,
} from "@/app/(dashboard)/upgrade/actions";
import { BANK_VA_METHODS, PLAN_PRICE_IDR, type PakasirMethod, type Plan } from "@/lib/pakasir-constants";
import { USDT_WALLETS, USDT_PRICE, type UsdtNetwork } from "@/lib/usdt";
import { useT } from "@/lib/i18n/client";

type Tab = "QRIS" | "BANK" | "USDT";

interface AppliedPromo {
  code: string;
  idr: { original: number; discount: number; final: number };
  usdt: { original: number; discount: number; final: number };
}

interface InstantResult {
  orderId: string;
  amount: number;
  totalPayment: number;
  paymentNumber: string;
  qrImage: string | null;
  expiredAt: string;
  method: PakasirMethod;
}

function formatIDR(n: number) {
  return `Rp${n.toLocaleString("id-ID")}`;
}

const PLAN_LABEL: Record<Plan, string> = {
  VIP: "VIP",
  MEMBERSHIP: "Membership",
  MEMBERSHIP_LIFETIME: "Membership Lifetime",
};

function CopyButton({ text }: { text: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-caption font-medium text-text-secondary hover:bg-surface-hover"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? t("Tersalin") : t("Copy")}
    </button>
  );
}

function StatusWaiting({ orderId, onCompleted }: { orderId: string; onCompleted: () => void }) {
  const t = useT();
  useEffect(() => {
    const interval = setInterval(async () => {
      const status = await checkInstantPaymentStatus(orderId);
      if (status === "COMPLETED") {
        clearInterval(interval);
        onCompleted();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [orderId, onCompleted]);

  return (
    <p className="mt-3 flex items-center gap-2 text-caption text-text-muted">
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      {t("Menunggu pembayaran — halaman ini otomatis update begitu pembayaran masuk.")}
    </p>
  );
}

export function PaymentModal({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const t = useT();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("QRIS");
  const [completed, setCompleted] = useState(false);

  // Langkah awal: kode promo (opsional). Order baru dibuat setelah "Lanjut ke pembayaran".
  const [started, setStarted] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<AppliedPromo | null>(null);
  const [promoChecking, setPromoChecking] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  // QRIS
  const [qris, setQris] = useState<InstantResult | null>(null);
  const [qrisLoading, setQrisLoading] = useState(false);
  const [qrisError, setQrisError] = useState<string | null>(null);
  const qrisRequested = useRef(false);

  // Bank transfer
  const [bank, setBank] = useState<PakasirMethod | null>(null);
  const [bankResult, setBankResult] = useState<InstantResult | null>(null);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);

  // USDT
  const [network, setNetwork] = useState<UsdtNetwork>("BEP20");
  const [slip, setSlip] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [usdtSubmitting, setUsdtSubmitting] = useState(false);
  const [usdtSubmitted, setUsdtSubmitted] = useState(false);
  const [usdtError, setUsdtError] = useState<string | null>(null);

  async function applyPromo(): Promise<boolean> {
    setPromoError(null);
    setPromoChecking(true);
    try {
      const result = await previewPromoCode({ plan, code: promoInput });
      if (!result.ok) {
        setPromo(null);
        setPromoError(result.message);
        return false;
      }
      setPromo({ code: result.code, idr: result.idr, usdt: result.usdt });
      return true;
    } catch (e) {
      setPromo(null);
      setPromoError(e instanceof Error ? e.message : t("Terjadi kesalahan."));
      return false;
    } finally {
      setPromoChecking(false);
    }
  }

  async function handleContinue() {
    // Kode sudah diketik tapi belum diterapkan: terapkan dulu, lanjut hanya kalau valid.
    if (promoInput.trim() && !promo) {
      if (!(await applyPromo())) return;
    }
    setStarted(true);
  }

  useEffect(() => {
    if (started && tab === "QRIS" && !qrisRequested.current) {
      qrisRequested.current = true;
      setQrisLoading(true);
      createInstantPayment({ plan, method: "qris", promoCode: promo?.code ?? null })
        .then((r) => (r.ok ? setQris(r) : setQrisError(r.message)))
        .catch((e) => setQrisError(e instanceof Error ? e.message : t("Gagal membuat QRIS")))
        .finally(() => setQrisLoading(false));
    }
  }, [started, tab, plan]);

  function selectBank(method: PakasirMethod) {
    setBank(method);
    setBankResult(null);
    setBankError(null);
    setBankLoading(true);
    createInstantPayment({ plan, method, promoCode: promo?.code ?? null })
      .then((r) => (r.ok ? setBankResult(r) : setBankError(r.message)))
      .catch((e) => setBankError(e instanceof Error ? e.message : t("Gagal membuat Virtual Account")))
      .finally(() => setBankLoading(false));
  }

  async function handleUsdtSubmit() {
    setUsdtError(null);
    if (!slip) {
      setUsdtError("Bukti transfer wajib diupload.");
      return;
    }
    setUsdtSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("plan", plan);
      fd.set("network", network);
      fd.set("slip", slip);
      fd.set("note", note);
      fd.set("promo_code", promo?.code ?? "");
      const res = await submitUsdtPayment(fd);
      if (!res.ok) {
        setUsdtError(res.message);
        return;
      }
      setUsdtSubmitted(true);
    } catch (e) {
      setUsdtError(e instanceof Error ? e.message : t("Gagal mengirim bukti transfer"));
    } finally {
      setUsdtSubmitting(false);
    }
  }

  function handleCompleted() {
    setCompleted(true);
    router.refresh();
  }

  const tabBtn = (t: Tab, label: string) => (
    <button
      type="button"
      onClick={() => setTab(t)}
      className={cx(
        "flex-1 rounded-lg px-3 py-2 text-body-sm font-semibold transition-colors",
        tab === t ? "bg-primary text-text-on-primary" : "text-text-secondary hover:bg-surface-hover"
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-h3 text-text-primary">Payment</h2>
            <p className="text-body-sm text-text-secondary">
              {t(PLAN_LABEL[plan])} ·{" "}
              {promo ? (
                <>
                  <span className="text-text-muted line-through">{formatIDR(promo.idr.original)}</span>{" "}
                  <span className="font-semibold text-success">{formatIDR(promo.idr.final)}</span>
                </>
              ) : (
                formatIDR(PLAN_PRICE_IDR[plan])
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-text-muted hover:bg-surface-hover hover:text-text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {completed ? (
          <div className="mt-6 flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success-subtle">
              <Check className="h-7 w-7 text-success" />
            </div>
            <p className="text-h3 text-text-primary">{t("Pembayaran berhasil!")}</p>
            <p className="text-body-sm text-text-secondary">
              {t("Akun kamu sekarang aktif sebagai")} {t(PLAN_LABEL[plan])}{t(". Terima kasih!")}
            </p>
            <button type="button" onClick={onClose} className="btn-primary mt-2">
              {t("Tutup")}
            </button>
          </div>
        ) : !started ? (
          <div className="mt-5">
            <label className="text-body-sm font-medium text-text-secondary">{t("Kode promo (opsional)")}</label>
            <div className="mt-2 flex gap-2">
              <input
                value={promoInput}
                onChange={(e) => {
                  setPromoInput(e.target.value.toUpperCase());
                  setPromo(null);
                  setPromoError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && promoInput.trim()) applyPromo();
                }}
                maxLength={32}
                placeholder={t("Masukkan kode promo")}
                className="input-field flex-1"
                autoCapitalize="characters"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={applyPromo}
                disabled={!promoInput.trim() || promoChecking}
                className="shrink-0 rounded-lg border border-border px-4 text-body-sm font-semibold text-text-secondary hover:bg-surface-hover disabled:opacity-50"
              >
                {promoChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Terapkan")}
              </button>
            </div>

            {promoError && <p className="mt-2 text-caption text-error">{promoError}</p>}
            {promo && (
              <div className="mt-3 rounded-lg border border-success/30 bg-success-subtle px-3 py-2 text-body-sm text-success">
                <p className="font-semibold">
                  {t("Kode {code} diterapkan", { code: promo.code })} · {t("hemat {amount}", { amount: formatIDR(promo.idr.discount) })}
                </p>
                <p className="text-caption">
                  {formatIDR(promo.idr.final)} · {t("atau")} {promo.usdt.final} USDT
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={handleContinue}
              disabled={promoChecking}
              className="btn-primary mt-5 flex w-full items-center justify-center gap-2 disabled:opacity-60"
            >
              {t("Lanjut ke pembayaran")}
            </button>
          </div>
        ) : (
          <>
            <div className="mt-5 flex gap-1 rounded-xl border border-border p-1">
              {tabBtn("QRIS", "QRIS")}
              {tabBtn("BANK", t("Transfer Bank"))}
              {tabBtn("USDT", "USDT")}
            </div>

            {tab === "QRIS" && (
              <div className="mt-5">
                {qrisLoading && (
                  <p className="flex items-center justify-center gap-2 py-10 text-body-sm text-text-muted">
                    <Loader2 className="h-4 w-4 animate-spin" /> {t("Membuat QRIS...")}
                  </p>
                )}
                {qrisError && <p className="py-6 text-center text-body-sm text-error">{qrisError}</p>}
                {qris && (
                  <div className="flex flex-col items-center">
                    {qris.qrImage && (
                      <img src={qris.qrImage} alt="QRIS" className="h-64 w-64 rounded-lg border border-border bg-white p-2" />
                    )}
                    <p className="mt-3 text-body font-semibold text-text-primary">{formatIDR(qris.totalPayment)}</p>
                    <p className="text-caption text-text-muted">{t("Scan pakai aplikasi e-wallet/mobile banking apa saja")}</p>
                    <StatusWaiting orderId={qris.orderId} onCompleted={handleCompleted} />
                  </div>
                )}
              </div>
            )}

            {tab === "BANK" && (
              <div className="mt-5">
                <p className="text-body-sm font-medium text-text-secondary">{t("Pilih Bank")}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {BANK_VA_METHODS.map((b) => (
                    <button
                      key={b.method}
                      type="button"
                      onClick={() => selectBank(b.method)}
                      className={cx(
                        "rounded-full border px-2 py-1 text-caption font-medium transition-colors",
                        bank === b.method
                          ? "border-primary bg-primary-subtle text-primary"
                          : "border-border text-text-secondary hover:bg-surface-hover"
                      )}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>

                {bankLoading && (
                  <p className="flex items-center justify-center gap-2 py-8 text-body-sm text-text-muted">
                    <Loader2 className="h-4 w-4 animate-spin" /> {t("Membuat Virtual Account...")}
                  </p>
                )}
                {bankError && <p className="py-6 text-center text-body-sm text-error">{bankError}</p>}
                {bankResult && (
                  <div className="mt-4 rounded-lg border border-border bg-surface-2 p-4">
                    <p className="text-caption text-text-muted">{t("Nomor Virtual Account")}</p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="break-all text-body font-semibold text-text-primary">{bankResult.paymentNumber}</p>
                      <CopyButton text={bankResult.paymentNumber} />
                    </div>
                    <p className="mt-3 text-caption text-text-muted">Total Transfer</p>
                    <p className="text-body font-semibold text-text-primary">{formatIDR(bankResult.totalPayment)}</p>
                    <StatusWaiting orderId={bankResult.orderId} onCompleted={handleCompleted} />
                  </div>
                )}
              </div>
            )}

            {tab === "USDT" && (
              <div className="mt-5">
                {usdtSubmitted ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning-subtle">
                      <Check className="h-6 w-6 text-warning" />
                    </div>
                    <p className="text-body font-semibold text-text-primary">{t("Bukti transfer terkirim")}</p>
                    <p className="text-body-sm text-text-secondary">
                      {t("Admin akan verifikasi manual (biasanya beberapa jam). Kamu akan dapat notifikasi begitu akun kamu aktif.")}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      {(["BEP20", "TRC20"] as const).map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setNetwork(n)}
                          className={cx(
                            "flex-1 rounded-lg border px-3 py-2 text-body-sm font-semibold transition-colors",
                            network === n
                              ? "border-primary bg-primary-subtle text-primary"
                              : "border-border text-text-secondary hover:bg-surface-hover"
                          )}
                        >
                          {n}
                        </button>
                      ))}
                    </div>

                    <div className="mt-3 rounded-lg border border-warning/30 bg-warning-subtle px-3 py-2 text-caption text-warning">
                      {t("Kirim hanya USDT jaringan")} {USDT_WALLETS[network].label}{t(". Kirim lewat jaringan lain bisa mengakibatkan dana hilang.")}
                    </div>

                    <div className="mt-3 rounded-lg border border-border bg-surface-2 p-4">
                      <p className="text-caption text-text-muted">{t("Alamat Deposit (")}{USDT_WALLETS[network].label})</p>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="break-all text-body-sm font-semibold text-text-primary">
                          {USDT_WALLETS[network].address}
                        </p>
                        <CopyButton text={USDT_WALLETS[network].address} />
                      </div>
                      <p className="mt-3 text-caption text-text-muted">{t("Jumlah")}</p>
                      <p className="text-body font-semibold text-text-primary">{promo ? promo.usdt.final : USDT_PRICE[plan]} USDT</p>
                    </div>

                    <div className="mt-4">
                      <label className="text-body-sm font-medium text-text-secondary">
                        {t("Bukti Transfer (wajib)")}
                      </label>
                      <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-body-sm text-text-secondary hover:bg-surface-hover">
                        <Upload className="h-4 w-4" />
                        {slip ? slip.name : t("Pilih screenshot / PDF bukti transfer")}
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={async (e) => {
                            const picked = e.target.files?.[0] ?? null;
                            // Gambar dikompres di browser (PDF dibiarkan apa adanya).
                            setSlip(picked ? await compressImageFile(picked).catch(() => picked) : null);
                          }}
                        />
                      </label>
                    </div>

                    <div className="mt-3">
                      <label className="text-body-sm font-medium text-text-secondary">{t("Catatan (opsional)")}</label>
                      <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder={t("TxID / hash transaksi")}
                        className="input-field mt-2"
                      />
                    </div>

                    {usdtError && <p className="mt-3 text-body-sm text-error">{usdtError}</p>}

                    <button
                      type="button"
                      onClick={handleUsdtSubmit}
                      disabled={usdtSubmitting}
                      className="btn-primary mt-4 flex w-full items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {usdtSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                      {t("Saya Sudah Transfer")}
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
