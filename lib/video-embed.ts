export type EmbedKind = "iframe" | "video" | "unknown";

export interface VideoEmbed {
  kind: EmbedKind;
  src: string;
}

/**
 * Ubah berbagai macam link video (Google Drive share link, YouTube,
 * Vimeo, atau link file video langsung) jadi src yang bisa di-embed
 * (iframe atau <video>) di halaman kita sendiri.
 */
export function getVideoEmbed(url: string): VideoEmbed {
  // Google Drive: .../file/d/{ID}/view  atau  ...?id={ID}
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/) ?? url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (driveMatch && url.includes("drive.google.com")) {
    return { kind: "iframe", src: `https://drive.google.com/file/d/${driveMatch[1]}/preview` };
  }

  // YouTube: watch?v=, youtu.be/, shorts/, embed/
  const ytMatch =
    url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/) ??
    url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/) ??
    url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/) ??
    url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
  if (ytMatch) {
    return { kind: "iframe", src: `https://www.youtube.com/embed/${ytMatch[1]}` };
  }

  // Vimeo: vimeo.com/{id}
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return { kind: "iframe", src: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  }

  // Link file video langsung (mp4/webm/ogg/mov), misalnya di-hosting sendiri (R2/S3/CDN)
  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)) {
    return { kind: "video", src: url };
  }

  // Nggak dikenali — coba tampilkan sebagai iframe apa adanya (mungkin
  // dari Loom atau platform lain yang link-nya sudah dalam bentuk embed).
  return { kind: "unknown", src: url };
}
