// Server-only helper untuk payment gateway Poketo (https://poketo.id/docs).
//
// Setup di Vercel → Project Settings → Environment Variables:
//   POKETO_API_KEY         — sk_test_... (sandbox) atau sk_live_... (produksi)
//   POKETO_WEBHOOK_SECRET  — whsec_... dari halaman webhook proyek Poketo
//   NEXT_PUBLIC_SITE_URL   — domain kamu, contoh: https://www.loki4xacademy.web.id
//
// Di dashboard Poketo, isi URL webhook proyek dengan:
//   https://<domain-kamu>/api/poketo/webhook      (event: invoice.paid)

import { createHmac, timingSafeEqual } from "crypto";

const DEFAULT_BASE_URL = "https://poketo.id/api/v1";
export const POKETO_MIN_AMOUNT = 10_000;

function getConfig() {
  const apiKey = process.env.POKETO_API_KEY;
  if (!apiKey) throw new Error("Poketo belum dikonfigurasi (POKETO_API_KEY belum diisi)");
  const baseUrl = (process.env.POKETO_API_BASE || DEFAULT_BASE_URL).replace(/\/$/, "");
  return { apiKey, baseUrl };
}

/** Terima bentuk respons polos maupun terbungkus ({ data: {...} } / { invoice: {...} }). */
function unwrap<T>(raw: unknown, keys: string[]): T {
  if (raw && typeof raw === "object") {
    for (const k of keys) {
      const inner = (raw as Record<string, unknown>)[k];
      if (inner && typeof inner === "object" && !Array.isArray(inner)) return inner as T;
    }
  }
  return raw as T;
}

export type PoketoStatus = "pending" | "paid" | "expired" | "cancelled" | "refunded" | string;

export interface PoketoInvoice {
  id: string; // INV-PKT-...
  referenceId: string; // order_id kita
  environment: string; // "sandbox" | "live"
  status: PoketoStatus;
  amount: number;
  totalAmount: number;
  paymentUrl: string;
  expiresAt: string | null;
  paidAt: string | null;
}

interface RawInvoice {
  id?: string;
  referenceId?: string;
  environment?: string;
  status?: string;
  amount?: number;
  totalAmount?: number;
  paymentUrl?: string;
  expiresAt?: string | null;
  paidAt?: string | null;
}

function normalize(raw: unknown): PoketoInvoice | null {
  const inv = unwrap<RawInvoice>(raw, ["invoice", "data"]);
  if (!inv || typeof inv.id !== "string" || typeof inv.referenceId !== "string" || typeof inv.status !== "string") return null;
  const amount = Number(inv.amount);
  if (!Number.isFinite(amount)) return null;
  return {
    id: inv.id,
    referenceId: inv.referenceId,
    environment: inv.environment ?? "",
    status: inv.status,
    amount,
    totalAmount: Number.isFinite(Number(inv.totalAmount)) ? Number(inv.totalAmount) : amount,
    paymentUrl: inv.paymentUrl ?? "",
    expiresAt: inv.expiresAt ?? null,
    paidAt: inv.paidAt ?? null,
  };
}

/**
 * Buat tagihan (invoice). Pembeli membayar di `paymentUrl` (halaman Poketo: QRIS / Virtual Account).
 * `referenceId` unik per proyek, jadi memakai order_id kita.
 */
export async function createPoketoInvoice(input: {
  orderId: string;
  amount: number;
  title: string;
  description?: string;
  customer?: { name?: string | null; email?: string | null };
  redirectUrl?: string;
  expiresInMinutes?: number;
}): Promise<PoketoInvoice | null> {
  const { apiKey, baseUrl } = getConfig();

  const body: Record<string, unknown> = {
    amount: Math.round(input.amount),
    referenceId: input.orderId,
    title: input.title,
    expiresInMinutes: input.expiresInMinutes ?? 1440,
  };
  if (input.description) body.description = input.description;
  if (input.redirectUrl) body.redirectUrl = input.redirectUrl;
  const customer: Record<string, string> = {};
  if (input.customer?.name) customer.name = input.customer.name.slice(0, 100);
  if (input.customer?.email) customer.email = input.customer.email;
  if (Object.keys(customer).length) body.customer = customer;

  const res = await fetch(`${baseUrl}/invoices`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`[poketo] create invoice gagal (${res.status}) order ${input.orderId}: ${detail.slice(0, 300)}`);
    return null;
  }
  const invoice = normalize(await res.json().catch(() => null));
  if (!invoice || !invoice.paymentUrl.startsWith("https://")) {
    console.error(`[poketo] respons create invoice tidak lengkap untuk order ${input.orderId}`);
    return null;
  }
  return invoice;
}

/** Ambil tagihan (bisa lewat id Poketo atau referenceId = order_id kita). Dipakai untuk verifikasi sebelum memberi akses. */
export async function getPoketoInvoice(idOrReference: string): Promise<PoketoInvoice | null> {
  const { apiKey, baseUrl } = getConfig();
  const res = await fetch(`${baseUrl}/invoices/${encodeURIComponent(idOrReference)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });
  if (!res.ok) {
    if (res.status !== 429) console.error(`[poketo] get invoice gagal (${res.status}) untuk ${idOrReference}`);
    return null;
  }
  return normalize(await res.json().catch(() => null));
}

/**
 * Verifikasi header `Poketo-Signature` (format `t=<unix>,v1=<hex>`):
 * HMAC-SHA256 atas "<t>.<raw body>" dengan secret whsec_..., dan tolak kalau t lebih tua dari 5 menit.
 */
export function verifyPoketoSignature(rawBody: string, header: string | null, secret: string, nowMs = Date.now()): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    })
  ) as Record<string, string>;
  const t = Number(parts.t);
  const v1 = parts.v1;
  if (!Number.isFinite(t) || !v1) return false;
  if (Math.abs(nowMs / 1000 - t) > 300) return false;

  const expected = createHmac("sha256", secret).update(`${parts.t}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(v1);
  return a.length === b.length && timingSafeEqual(a, b);
}
