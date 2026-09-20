"use client";

import { X, ExternalLink } from "lucide-react";
import { getVideoEmbed } from "@/lib/video-embed";

export function VideoPlayerModal({
  title,
  videoUrl,
  onClose,
}: {
  title: string;
  videoUrl: string;
  onClose: () => void;
}) {
  const embed = getVideoEmbed(videoUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-3xl flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="line-clamp-1 text-body font-semibold text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
          {embed.kind === "video" ? (
            <video src={embed.src} controls autoPlay className="h-full w-full" />
          ) : (
            <iframe
              src={embed.src}
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
              className="h-full w-full border-0"
            />
          )}
        </div>

        {embed.kind === "unknown" && (
          <p className="text-center text-caption text-white/60">
            Kalau video di atas tidak muncul, coba{" "}
            <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">
              buka link aslinya <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
