import { getT } from "@/lib/i18n/server";

/** Kotak abu-abu berkilau (shimmer). Atur ukuran lewat className, mis. "h-4 w-32". */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

/**
 * Kerangka halaman untuk loading.tsx: header, kartu angka, dan blok konten.
 * fullScreen = dipakai di luar layout (tanpa sidebar), mis. halaman publik.
 */
export async function PageSkeleton({ fullScreen = false }: { fullScreen?: boolean }) {
  const { t } = await getT();
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={t("Memuat...")}
      className={fullScreen ? "min-h-screen w-full bg-background" : "w-full"}
    >
      <span className="sr-only">{t("Memuat...")}</span>

      {/* Header halaman */}
      <div className="flex items-center justify-between border-b border-border px-4 py-4 lg:px-8">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3 w-64 max-w-[60vw]" />
        </div>
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>

      <div className="mx-auto max-w-content space-y-6 p-4 lg:p-8">
        {/* Kartu ringkasan */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-surface p-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-4 h-7 w-28" />
              <Skeleton className="mt-3 h-3 w-16" />
            </div>
          ))}
        </div>

        {/* Grafik dan daftar */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-surface p-4 lg:col-span-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-4 h-56 w-full" />
          </div>
          <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
            <Skeleton className="h-4 w-32" />
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
