import { NextResponse } from "next/server";
import { verifyPoketoSignature } from "@/lib/poketo";
import { finalizePakasirPayment } from "@/lib/pakasir-fulfillment";

// Poketo POST ke sini untuk setiap event tagihan. Docs: https://poketo.id/docs
// Set sebagai URL webhook proyek Poketo:  https://<domain-kamu>/api/poketo/webhook
//
// Header `Poketo-Signature` diverifikasi dengan POKETO_WEBHOOK_SECRET (whsec_...). Meski begitu,
// isi body tidak langsung dipercaya: finalizePakasirPayment mengecek ulang status tagihan ke API Poketo
// (pakai API key kita) sebelum memberi akses.
//
// Respons: 2xx = selesai. 5xx = Poketo mengulang (sampai 6 kali). 4xx lain = gagal permanen.

export async function POST(request: Request) {
  const raw = await request.text();

  const secret = process.env.POKETO_WEBHOOK_SECRET;
  if (secret) {
    if (!verifyPoketoSignature(raw, request.headers.get("poketo-signature"), secret)) {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }
  } else {
    console.warn("[poketo/webhook] POKETO_WEBHOOK_SECRET belum diisi — tanda tangan tidak diperiksa (status tetap diverifikasi ke API).");
  }

  let event: { type?: string; data?: { referenceId?: string; reference_id?: string } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Event selain pembayaran berhasil cukup diterima (tidak ada yang perlu dilakukan).
  if (event.type !== "invoice.paid") return NextResponse.json({ ok: true, ignored: event.type ?? null });

  const orderId = event.data?.referenceId ?? event.data?.reference_id;
  if (!orderId || typeof orderId !== "string") {
    return NextResponse.json({ error: "Missing referenceId" }, { status: 400 });
  }

  const result = await finalizePakasirPayment(orderId);
  if (result.status === "NOT_FOUND") return NextResponse.json({ error: "Unknown order" }, { status: 404 });
  if (result.status === "PENDING") {
    // Belum terverifikasi lunas di API Poketo: minta Poketo mengulang.
    return NextResponse.json({ error: "Not verified as paid yet" }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
