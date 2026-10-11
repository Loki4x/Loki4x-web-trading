// Server-only helpers for the Pakasir payment gateway (API v2).
// Docs: https://pakasir.com/p/create-transaction  (v1 dihentikan 20 Oktober 2026)
//
// Setup needed in Vercel → Project Settings → Environment Variables:
//   PAKASIR_PROJECT_SLUG    — "Slug" dari halaman detail proyek Pakasir kamu
//   PAKASIR_API_KEY         — "Api Key" dari halaman detail proyek Pakasir kamu
//   PAKASIR_WEBHOOK_SECRET  — "Secret" webhook dari halaman detail proyek Pakasir (dikirim sebagai header X-Secret)
//   NEXT_PUBLIC_SITE_URL    — domain kamu, contoh: https://www.loki4xacademy.web.id
//
// Lalu di dashboard Pakasir, isi "Webhook URL" proyekmu dengan:
//   https://<domain-kamu>/api/pakasir/webhook

export { PLAN_PRICE_IDR, BANK_VA_METHODS, type PakasirMethod } from "./pakasir-constants";
import type { PakasirMethod } from "./pakasir-constants";

const PAKASIR_BASE_URL = "https://app.pakasir.com";

function getCredentials() {
  const slug = process.env.PAKASIR_PROJECT_SLUG;
  const apiKey = process.env.PAKASIR_API_KEY;
  if (!slug || !apiKey) {
    throw new Error("Pakasir belum dikonfigurasi (PAKASIR_PROJECT_SLUG / PAKASIR_API_KEY belum diisi)");
  }
  return { slug, apiKey };
}

/** Beberapa API membungkus hasilnya (mis. { payment: {...} }); terima bentuk polos maupun terbungkus. */
function unwrap<T>(raw: unknown, keys: string[]): T {
  if (raw && typeof raw === "object") {
    for (const k of keys) {
      const inner = (raw as Record<string, unknown>)[k];
      if (inner && typeof inner === "object") return inner as T;
    }
  }
  return raw as T;
}

export interface PakasirCreatedPayment {
  txn_id: string; // ID transaksi Pakasir (dibutuhkan API v2 untuk cek status)
  payment_number: string; // QRIS string, atau nomor VA
  fee: number;
  total_payment: number;
  expired_at: string;
  is_sandbox: boolean;
}

/**
 * Bikin transaksi via API v2 — dapat balik QR string / nomor VA langsung,
 * buat ditampilkan sendiri di halaman kita (bukan redirect ke Pakasir).
 * Endpoint ini "find or create": panggilan ulang dengan order_id & body yang sama
 * mengembalikan transaksi yang sama.
 */
export async function createPakasirTransaction({
  method,
  orderId,
  amount,
}: {
  method: PakasirMethod;
  orderId: string;
  amount: number;
}): Promise<PakasirCreatedPayment | null> {
  const { slug, apiKey } = getCredentials();
  const res = await fetch(
    `${PAKASIR_BASE_URL}/api/v2/create-transaction/${encodeURIComponent(slug)}/${encodeURIComponent(orderId)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
      body: JSON.stringify({ method, amount }),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`[pakasir] create-transaction gagal (${res.status}) untuk order ${orderId}: ${detail.slice(0, 300)}`);
    return null;
  }

  const raw = await res.json().catch(() => null);
  const p = unwrap<{
    txn_id?: string;
    qr_string?: string;
    va_number?: string;
    fee?: number;
    total_payment?: number;
    expired_at?: string;
    is_sandbox?: boolean;
  }>(raw, ["payment", "data", "transaction"]);

  const paymentNumber = p?.qr_string ?? p?.va_number;
  if (!p?.txn_id || !paymentNumber) {
    console.error(`[pakasir] respons create-transaction tidak lengkap untuk order ${orderId}`);
    return null;
  }

  if (!p.expired_at) {
    // Jangan diteruskan sebagai "" (ditolak kolom timestamp di database). Catat nama field-nya supaya mudah dilacak.
    console.warn(`[pakasir] respons tanpa expired_at untuk order ${orderId}; field yang ada: ${Object.keys(p).join(", ")}`);
  }

  return {
    txn_id: p.txn_id,
    payment_number: paymentNumber,
    fee: p.fee ?? 0,
    total_payment: p.total_payment ?? amount,
    expired_at: p.expired_at ?? "",
    is_sandbox: Boolean(p.is_sandbox),
  };
}

export interface PakasirTransaction {
  txn_id: string;
  order_id: string;
  amount: number;
  is_sandbox: boolean;
  status: string; // "pending" | "completed" | "canceled"
  completed_at: string | null;
}

/**
 * Cek status transaksi langsung ke Pakasir (bukan cuma percaya body webhook).
 * Dipakai webhook & tombol "Cek Status" untuk verifikasi sebelum upgrade tier user.
 * Batas Pakasir: 1 request per transaksi per 4 detik — kalau kena batas, hasilnya null (dianggap masih pending).
 */
export async function getPakasirTransactionStatus({ txnId }: { txnId: string }): Promise<PakasirTransaction | null> {
  const { slug, apiKey } = getCredentials();
  const res = await fetch(
    `${PAKASIR_BASE_URL}/api/v2/transaction-status/${encodeURIComponent(slug)}/${encodeURIComponent(txnId)}`,
    { headers: { "X-Api-Key": apiKey }, cache: "no-store" }
  );
  if (!res.ok) {
    if (res.status !== 429) console.error(`[pakasir] transaction-status gagal (${res.status}) untuk txn ${txnId}`);
    return null;
  }

  const raw = await res.json().catch(() => null);
  const t = unwrap<Partial<PakasirTransaction>>(raw, ["transaction", "data"]);
  if (!t || typeof t.status !== "string" || typeof t.order_id !== "string" || typeof t.amount !== "number") return null;

  return {
    txn_id: t.txn_id ?? txnId,
    order_id: t.order_id,
    amount: t.amount,
    is_sandbox: Boolean(t.is_sandbox),
    status: t.status,
    completed_at: t.completed_at ?? null,
  };
}

/**
 * Simulasi pembayaran (hanya proyek Sandbox). CATATAN: ini masih endpoint API v1
 * (/api/paymentsimulation) karena dokumentasi v2 belum mencantumkan endpoint simulasi.
 * Endpoint v1 ikut dihentikan 20 Oktober 2026 — setelah itu simulasi lewat dashboard Pakasir.
 */
export async function simulatePakasirPayment({ orderId, amount }: { orderId: string; amount: number }) {
  const { slug, apiKey } = getCredentials();
  const res = await fetch(`${PAKASIR_BASE_URL}/api/paymentsimulation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project: slug, order_id: orderId, amount, api_key: apiKey }),
  });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, data };
}
