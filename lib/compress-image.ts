/**
 * Kompres gambar di browser sebelum diupload (target < ~1,5 MB, sisi terpanjang <= 1920px).
 * File non-gambar (mis. PDF), GIF, dan SVG dikembalikan apa adanya.
 */
export async function compressImageFile(
  file: File,
  opts: { maxBytes?: number; maxDimension?: number } = {}
): Promise<File> {
  const maxBytes = opts.maxBytes ?? 1_500_000;
  const maxDimension = opts.maxDimension ?? 1920;

  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") return file;
  if (file.size <= maxBytes) return file;

  const bitmap = await loadBitmap(file);
  if (!bitmap) return file;

  try {
    let scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const qualities = [0.85, 0.75, 0.65, 0.55];
    let best: Blob | null = null;

    for (let round = 0; round < 6; round++) {
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.fillStyle = "#ffffff"; // PNG transparan -> latar putih (JPEG tidak punya alpha)
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(bitmap.source, 0, 0, w, h);

      for (const q of qualities) {
        const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", q));
        if (!blob) continue;
        best = blob;
        if (blob.size <= maxBytes) {
          return toFile(blob, file.name);
        }
      }
      scale *= 0.8; // masih kebesaran -> kecilkan dimensinya
      if (Math.max(bitmap.width, bitmap.height) * scale < 600) break;
    }
    return best && best.size < file.size ? toFile(best, file.name) : file;
  } finally {
    bitmap.close();
  }
}

function toFile(blob: Blob, originalName: string): File {
  const base = originalName.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
}

interface LoadedBitmap {
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
}

async function loadBitmap(file: File): Promise<LoadedBitmap | null> {
  try {
    if (typeof createImageBitmap === "function") {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    }
  } catch {
    /* lanjut ke fallback */
  }
  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch {
    return null; // format tidak bisa dibaca browser (mis. HEIC di Chrome) -> pakai file asli
  }
}
