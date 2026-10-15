import { CHAT_IMAGE_MAX_BYTES } from "@/lib/chat";

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode"));
    };
    img.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/**
 * Perkecil + kompres foto di browser sebelum dikirim (maks 1600px, JPEG), supaya
 * foto HP berukuran besar tetap muat di batas 2MB dan hemat kuota. Return null kalau
 * file bukan gambar yang bisa dibaca atau tetap terlalu besar.
 */
export async function prepareChatImage(file: File): Promise<File | null> {
  if (!file.type.startsWith("image/")) return null;
  try {
    const img = await loadImage(file);
    for (const [maxDim, quality] of [
      [1600, 0.82],
      [1280, 0.7],
      [1024, 0.6],
    ] as const) {
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const blob = await toBlob(canvas, quality);
      if (blob && blob.size <= CHAT_IMAGE_MAX_BYTES) {
        return new File([blob], "foto.jpg", { type: "image/jpeg" });
      }
    }
    return null;
  } catch {
    // Browser tidak bisa membaca format ini (mis. HEIC di Chrome). Kirim apa adanya kalau sudah JPG/PNG/WebP kecil.
    const okType = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
    return okType && file.size <= CHAT_IMAGE_MAX_BYTES ? file : null;
  }
}
