import { communityImageUrl } from "@/lib/community";

/** Foto di dalam gelembung chat komunitas. Klik untuk membuka ukuran penuh di tab baru. */
export function CommunityImage({ imageKey, alt }: { imageKey: string; alt: string }) {
  const url = communityImageUrl(imageKey);
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block">
      {/* eslint-disable-next-line @next/next/no-img-element -- foto privat dari endpoint kita sendiri */}
      <img src={url} alt={alt} loading="lazy" className="max-h-60 w-full rounded-lg object-cover" />
    </a>
  );
}
