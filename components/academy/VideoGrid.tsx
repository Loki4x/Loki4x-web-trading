import { PlayCircle } from "lucide-react";

export interface AcademyVideo {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string;
  video_url: string;
}

export function VideoGrid({ videos }: { videos: AcademyVideo[] }) {
  if (videos.length === 0) {
    return (
      <div className="card py-12 text-center text-body-sm text-text-muted">
        Belum ada video di kategori ini.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {videos.map((v) => (
        <a
          key={v.id}
          href={v.video_url}
          target="_blank"
          rel="noopener noreferrer"
          className="card group flex flex-col gap-3 !p-3 transition-colors hover:border-primary"
        >
          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-surface-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={v.thumbnail_url} alt={v.title} className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
              <PlayCircle className="h-10 w-10 text-white" />
            </div>
          </div>
          <div className="px-1 pb-1">
            <h3 className="text-body-sm font-semibold text-text-primary line-clamp-2">{v.title}</h3>
            {v.description && (
              <p className="mt-1 text-caption text-text-muted line-clamp-2">{v.description}</p>
            )}
          </div>
        </a>
      ))}
    </div>
  );
}
