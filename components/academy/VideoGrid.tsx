"use client";

import { useState } from "react";
import { CheckCircle2, PlayCircle } from "lucide-react";
import { VideoPlayerModal } from "@/components/academy/VideoPlayerModal";
import { setVideoWatched } from "@/app/(dashboard)/academy/actions";
import { useT } from "@/lib/i18n/client";

export interface AcademyVideo {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string;
  video_url: string;
}

export function VideoGrid({
  videos,
  watchedIds = null,
}: {
  videos: AcademyVideo[];
  /** null = fitur progres tidak aktif (mis. SQL belum dijalankan) */
  watchedIds?: string[] | null;
}) {
  const t = useT();
  const [playing, setPlaying] = useState<AcademyVideo | null>(null);
  const [watched, setWatched] = useState<Set<string>>(() => new Set(watchedIds ?? []));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleWatched(id: string) {
    const next = !watched.has(id);
    setSaving(true);
    setError(null);
    const res = await setVideoWatched(id, next);
    setSaving(false);
    if (!res.success) {
      setError(res.message);
      return;
    }
    setWatched((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(id);
      else copy.delete(id);
      return copy;
    });
  }

  if (videos.length === 0) {
    return (
      <div className="card py-12 text-center text-body-sm text-text-muted">
        {t("Belum ada video di kategori ini.")}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setPlaying(v)}
            className="card group flex flex-col gap-3 !p-3 text-left transition-colors hover:border-primary"
          >
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={v.thumbnail_url} alt={v.title} className="h-full w-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                <PlayCircle className="h-10 w-10 text-white" />
              </div>
              {watched.has(v.id) && (
                <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-success px-2 py-0.5 text-caption font-semibold text-white shadow">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t("Sudah ditonton")}
                </span>
              )}
            </div>
            <div className="px-1 pb-1">
              <h3 className="text-body-sm font-semibold text-text-primary line-clamp-2">{v.title}</h3>
              {v.description && (
                <p className="mt-1 text-caption text-text-muted line-clamp-2">{v.description}</p>
              )}
            </div>
          </button>
        ))}
      </div>

      {playing && (
        <VideoPlayerModal
          title={playing.title}
          videoUrl={playing.video_url}
          onClose={() => {
            setPlaying(null);
            setError(null);
          }}
          watched={watchedIds === null ? undefined : watched.has(playing.id)}
          onToggleWatched={() => toggleWatched(playing.id)}
          saving={saving}
          error={error}
        />
      )}
    </>
  );
}
