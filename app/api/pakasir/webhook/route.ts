import { NextResponse } from "next/server";
import { finalizePakasirPayment } from "@/lib/pakasir-fulfillment";

// Pakasir POSTs here whenever a payment completes.
// Docs: https://pakasir.com/p/docs (bagian D. Webhook)
//
// Set URL ini sebagai "Webhook URL" di halaman edit proyek Pakasir kamu:
//   https://<domain-kamu>/api/pakasir/webhook
//
// Pakasir tidak menandatangani (sign) payload webhook-nya, jadi kita tidak
// langsung percaya isi body-nya — finalizePakasirPayment cek ulang statusnya
// lewat Transaction Detail API (pakai API key kita sendiri) sebelum upgrade tier.
export async function POST(request: Request) {
  let body: { order_id?: string; amount?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.order_id || !body.amount) {
    return NextResponse.json({ error: "Missing order_id/amount" }, { status: 400 });
  }

  const result = await finalizePakasirPayment(body.order_id);

  if (result.status === "NOT_FOUND") {
    return NextResponse.json({ error: "Unknown order_id" }, { status: 404 });
  }
  if (result.status === "PENDING") {
    return NextResponse.json({ error: "Transaction not verified as completed" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
