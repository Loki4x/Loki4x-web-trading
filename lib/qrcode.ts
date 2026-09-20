import QRCode from "qrcode";

/** Generate a QR code PNG as a data URL from any text (QRIS string, wallet address, dll). */
export async function generateQrDataUrl(text: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(text, { width: 320, margin: 1 });
  } catch (err) {
    console.error("Gagal generate QR code:", err);
    return null;
  }
}
