// Server-only helpers for the Pakasir payment gateway.
// Docs: https://pakasir.com/p/docs
//
// Setup needed in Vercel → Project Settings → Environment Variables:
//   PAKASIR_PROJECT_SLUG   — "Slug" dari halaman detail proyek Pakasir kamu
//   PAKASIR_API_KEY        — "Api Key" dari halaman detail proyek Pakasir kamu
//   NEXT_PUBLIC_SITE_URL   — domain kamu, contoh: https://4xcomunity.my.id
//
// Lalu di dashboard Pakasir, isi "Webhook URL" proyekmu dengan:
//   https://<domain-kamu>/api/pakasir/webhook

// Konversi dari $20 / $35 pakai kurs ~Rp17.900/USD (per September 2026).
export const PLAN_PRICE_IDR: Record<"VIP" | "MEMBERSHIP", number> = {
  VIP: 358_000,
  MEMBERSHIP: 627_000,
};

const PAKASIR_BASE_URL = "https://app.pakasir.com";

function getCredentials() {
  const slug = process.env.PAKASIR_PROJECT_SLUG;
  const apiKey = process.env.PAKASIR_API_KEY;
  if (!slug || !apiKey) {
    throw new Error("Pakasir belum dikonfigurasi (PAKASIR_PROJECT_SLUG / PAKASIR_API_KEY belum diisi)");
  }
  return { slug, apiKey };
}

/** Bangun URL hosted-checkout Pakasir buat di-redirect user ke sana. */
export function buildPakasirCheckoutUrl({
  amount,
  orderId,
  redirectUrl,
}: {
  amount: number;
  orderId: string;
  redirectUrl: string;
}) {
  const { slug } = getCredentials();
  const url = new URL(`${PAKASIR_BASE_URL}/pay/${slug}/${amount}`);
  url.searchParams.set("order_id", orderId);
  url.searchParams.set("redirect", redirectUrl);
  return url.toString();
}

export interface PakasirTransaction {
  amount: number;
  order_id: string;
  project: string;
  status: string; // "pending" | "completed" | "failed" (belum didokumentasikan lengkap statusnya)
  payment_method: string;
  completed_at: string | null;
}

/**
 * Cek status transaksi langsung ke Pakasir (bukan cuma percaya body webhook).
 * Dipakai webhook buat verifikasi sebelum upgrade tier user.
 */
export async function getPakasirTransactionDetail({
  orderId,
  amount,
}: {
  orderId: string;
  amount: number;
}): Promise<PakasirTransaction | null> {
  const { slug, apiKey } = getCredentials();
  const url = new URL(`${PAKASIR_BASE_URL}/api/transactiondetail`);
  url.searchParams.set("project", slug);
  url.searchParams.set("amount", String(amount));
  url.searchParams.set("order_id", orderId);
  url.searchParams.set("api_key", apiKey);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) return null;

  const data = (await res.json()) as { transaction?: PakasirTransaction };
  return data.transaction ?? null;
}

/**
 * Cuma jalan kalau proyek Pakasir masih mode Sandbox — memicu Pakasir
 * langsung menganggap sebuah order "lunas" dan mengirim webhook asli ke
 * kita, tanpa perlu transfer uang beneran. Dipakai admin buat testing.
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
