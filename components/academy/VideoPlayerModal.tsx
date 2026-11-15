"use client";

import { X, ExternalLink, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { getVideoEmbed } from "@/lib/video-embed";
import { useT } from "@/lib/i18n/client";

export function VideoPlayerModal({
  title,
  videoUrl,
  onClose,
  watched,
  onToggleWatched,
  saving = false,
  error = null,
}: {
  title: string;
  videoUrl: string;
  onClose: () => void;
  /** undefined = tombol "sudah ditonton" disembunyikan */
  watched?: boolean;
  onToggleWatched?: () => void;
  saving?: boolean;
  error?: string | null;
}) {
  const t = useT();
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

        {watched !== undefined && onToggleWatched && (
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={onToggleWatched}
              disabled={saving}
              className={
                watched
                  ? "inline-flex items-center gap-2 rounded-full bg-success px-5 py-2.5 text-body-sm font-semibold text-white disabled:opacity-60"
                  : "inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-2.5 text-body-sm font-semibold text-white hover:bg-white/10 disabled:opacity-60"
              }
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : watched ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Circle className="h-4 w-4" />
              )}
              {watched ? t("Sudah ditonton") : t("Tandai sudah ditonton")}
            </button>
            {error && <p className="text-center text-caption text-red-300">{error}</p>}
          </div>
        )}

        {embed.kind === "unknown" && (
          <p className="text-center text-caption text-white/60">
            {t("Kalau video di atas tidak muncul, coba")}{" "}
            <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">
              {t("buka link aslinya")} <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
