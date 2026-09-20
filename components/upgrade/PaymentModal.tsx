"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Copy, Check, Upload, Loader2 } from "lucide-react";
import { cx } from "@/lib/utils";
import {
  createInstantPayment,
  checkInstantPaymentStatus,
  submitUsdtPayment,
} from "@/app/(dashboard)/upgrade/actions";
import { BANK_VA_METHODS, PLAN_PRICE_IDR, type PakasirMethod, type Plan } from "@/lib/pakasir-constants";
import { USDT_WALLETS, USDT_PRICE, type UsdtNetwork } from "@/lib/usdt";

type Tab = "QRIS" | "BANK" | "USDT";

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
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-caption font-medium text-text-secondary hover:bg-surface-hover"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Tersalin" : "Copy"}
    </button>
  );
}

function StatusWaiting({ orderId, onCompleted }: { orderId: string; onCompleted: () => void }) {
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
      Menunggu pembayaran — halaman ini otomatis update begitu pembayaran masuk.
    </p>
  );
}

export function PaymentModal({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("QRIS");
  const [completed, setCompleted] = useState(false);

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

  useEffect(() => {
    if (tab === "QRIS" && !qrisRequested.current) {
      qrisRequested.current = true;
      setQrisLoading(true);
      createInstantPayment({ plan, method: "qris" })
        .then(setQris)
        .catch((e) => setQrisError(e instanceof Error ? e.message : "Gagal membuat QRIS"))
        .finally(() => setQrisLoading(false));
    }
  }, [tab, plan]);

  function selectBank(method: PakasirMethod) {
    setBank(method);
    setBankResult(null);
    setBankError(null);
    setBankLoading(true);
    createInstantPayment({ plan, method })
      .then(setBankResult)
      .catch((e) => setBankError(e instanceof Error ? e.message : "Gagal membuat Virtual Account"))
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
      await submitUsdtPayment(fd);
      setUsdtSubmitted(true);
    } catch (e) {
      setUsdtError(e instanceof Error ? e.message : "Gagal mengirim bukti transfer");
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
              {PLAN_LABEL[plan]} · {formatIDR(PLAN_PRICE_IDR[plan])}
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
            <p className="text-h3 text-text-primary">Pembayaran berhasil!</p>
            <p className="text-body-sm text-text-secondary">
              Akun kamu sekarang aktif sebagai {PLAN_LABEL[plan]}. Terima kasih!
            </p>
            <button type="button" onClick={onClose} className="btn-primary mt-2">
              Tutup
            </button>
          </div>
        ) : (
          <>
            <div className="mt-5 flex gap-1 rounded-xl border border-border p-1">
              {tabBtn("QRIS", "QRIS")}
              {tabBtn("BANK", "Transfer Bank")}
              {tabBtn("USDT", "USDT")}
            </div>

            {tab === "QRIS" && (
              <div className="mt-5">
                {qrisLoading && (
                  <p className="flex items-center justify-center gap-2 py-10 text-body-sm text-text-muted">
                    <Loader2 className="h-4 w-4 animate-spin" /> Membuat QRIS...
                  </p>
                )}
                {qrisError && <p className="py-6 text-center text-body-sm text-error">{qrisError}</p>}
                {qris && (
                  <div className="flex flex-col items-center">
                    {qris.qrImage && (
                      <img src={qris.qrImage} alt="QRIS" className="h-64 w-64 rounded-lg border border-border bg-white p-2" />
                    )}
                    <p className="mt-3 text-body font-semibold text-text-primary">{formatIDR(qris.totalPayment)}</p>
                    <p className="text-caption text-text-muted">Scan pakai aplikasi e-wallet/mobile banking apa saja</p>
                    <StatusWaiting orderId={qris.orderId} onCompleted={handleCompleted} />
                  </div>
                )}
              </div>
            )}

            {tab === "BANK" && (
              <div className="mt-5">
                <p className="text-body-sm font-medium text-text-secondary">Pilih Bank</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {BANK_VA_METHODS.map((b) => (
                    <button
                      key={b.method}
                      type="button"
                      onClick={() => selectBank(b.method)}
                      className={cx(
                        "rounded-full border px-3 py-1.5 text-body-sm font-medium transition-colors",
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
                    <Loader2 className="h-4 w-4 animate-spin" /> Membuat Virtual Account...
                  </p>
                )}
                {bankError && <p className="py-6 text-center text-body-sm text-error">{bankError}</p>}
                {bankResult && (
                  <div className="mt-4 rounded-lg border border-border bg-surface-2 p-4">
                    <p className="text-caption text-text-muted">Nomor Virtual Account</p>
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
                    <p className="text-body font-semibold text-text-primary">Bukti transfer terkirim</p>
                    <p className="text-body-sm text-text-secondary">
                      Admin akan verifikasi manual (biasanya beberapa jam). Kamu akan dapat notifikasi begitu akun
                      kamu aktif.
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
                      Kirim hanya USDT jaringan {USDT_WALLETS[network].label}. Kirim lewat jaringan lain bisa
                      mengakibatkan dana hilang.
                    </div>

                    <div className="mt-3 rounded-lg border border-border bg-surface-2 p-4">
                      <p className="text-caption text-text-muted">Alamat Deposit ({USDT_WALLETS[network].label})</p>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="break-all text-body-sm font-semibold text-text-primary">
                          {USDT_WALLETS[network].address}
                        </p>
                        <CopyButton text={USDT_WALLETS[network].address} />
                      </div>
                      <p className="mt-3 text-caption text-text-muted">Jumlah</p>
                      <p className="text-body font-semibold text-text-primary">{USDT_PRICE[plan]} USDT</p>
                    </div>

                    <div className="mt-4">
                      <label className="text-body-sm font-medium text-text-secondary">
                        Bukti Transfer (wajib)
                      </label>
                      <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-body-sm text-text-secondary hover:bg-surface-hover">
                        <Upload className="h-4 w-4" />
                        {slip ? slip.name : "Pilih screenshot / PDF bukti transfer"}
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => setSlip(e.target.files?.[0] ?? null)}
                        />
                      </label>
                    </div>

                    <div className="mt-3">
                      <label className="text-body-sm font-medium text-text-secondary">Catatan (opsional)</label>
                      <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="TxID / hash transaksi"
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
                      Saya Sudah Transfer
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
