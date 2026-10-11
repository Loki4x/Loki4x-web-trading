import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { finalizePakasirPayment } from "@/lib/pakasir-fulfillment";

// Pakasir (API v2) POST ke sini setiap transaksi berhasil.
// Docs: https://pakasir.com/p/webhook
//
// Set URL ini sebagai "Webhook URL" di halaman detail proyek Pakasir kamu:
//   https://<domain-kamu>/api/pakasir/webhook
//
// Pakasir mengirim header `X-Secret` (lihat/reset di bagian bawah halaman detail proyek).
// Isi nilai itu ke env PAKASIR_WEBHOOK_SECRET. Walau begitu isi body tetap tidak
// langsung dipercaya — finalizePakasirPayment cek ulang statusnya lewat API
// transaction-status (pakai API key kita sendiri) sebelum upgrade tier.

function secretMatches(request: Request): boolean {
  const expected = process.env.PAKASIR_WEBHOOK_SECRET;
  if (!expected) {
    console.warn("[pakasir/webhook] PAKASIR_WEBHOOK_SECRET belum diisi — header X-Secret tidak diperiksa.");
    return true; // tetap aman: status transaksi diverifikasi ulang ke Pakasir
  }
  const received = Buffer.from(request.headers.get("x-secret") ?? "");
  const wanted = Buffer.from(expected);
  return received.length === wanted.length && timingSafeEqual(received, wanted);
}

export async function POST(request: Request) {
  if (!secretMatches(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { order_id?: string; txn_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.order_id || typeof body.order_id !== "string") {
    return NextResponse.json({ error: "Missing order_id" }, { status: 400 });
  }

  const result = await finalizePakasirPayment(body.order_id, typeof body.txn_id === "string" ? body.txn_id : null);

  if (result.status === "NOT_FOUND") {
    return NextResponse.json({ error: "Unknown order_id" }, { status: 404 });
  }
  if (result.status === "PENDING") {
    return NextResponse.json({ error: "Transaction not verified as completed" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
