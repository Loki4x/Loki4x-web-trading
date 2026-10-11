import { getT } from "@/lib/i18n/server";

/**
 * Skeleton loading: kerangka abu-abu berkilau (shimmer) yang meniru bentuk halaman asli,
 * jadi user melihat "pratinjau" kolomnya dulu sebelum data benar-benar tampil.
 * Gaya .skeleton + animasi shimmer ada di app/globals.css.
 */

/** Satu kotak/garis berkilau. Atur ukuran lewat className, mis. "h-4 w-32". */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

/** Bungkus halaman: <main> yang sama dengan halaman asli + label untuk pembaca layar. */
export async function SkeletonPage({
  children,
  title = true,
  back = false,
}: {
  children: React.ReactNode;
  /** Tampilkan placeholder judul + subjudul halaman. */
  title?: boolean;
  /** Tampilkan placeholder tombol "Kembali" di atas judul. */
  back?: boolean;
}) {
  const { t } = await getT();
  return (
    <main
      role="status"
      aria-busy="true"
      aria-label={t("Memuat...")}
      className="mx-auto max-w-content px-6 py-8"
    >
      <span className="sr-only">{t("Memuat...")}</span>
      {back && <Skeleton className="mb-4 h-4 w-40" />}
      {title && (
        <div className="mb-6 space-y-2">
          <Skeleton className="h-7 w-56 max-w-full" />
          <Skeleton className="h-3.5 w-80 max-w-full" />
        </div>
      )}
      {children}
    </main>
  );
}

/** Topbar "Halo, nama" di halaman Dashboard. */
export function SkeletonTopbar() {
  return (
    <div className="flex h-topbar items-center justify-between border-b border-border px-6">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="hidden h-3 w-44 sm:block" />
    </div>
  );
}

/** Kartu kosong dengan judul opsional. */
export function SkeletonCard({
  className = "",
  titleWidth = "w-40",
  children,
}: {
  className?: string;
  titleWidth?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div className={`card ${className}`}>
      {titleWidth && <Skeleton className={`mb-4 h-4 ${titleWidth}`} />}
      {children}
    </div>
  );
}

/** Kartu angka (seperti KpiCard). */
export function SkeletonKpiRow({ count = 4, className = "lg:grid-cols-4" }: { count?: number; className?: string }) {
  return (
    <div className={`mb-6 grid grid-cols-2 gap-4 ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-4 w-4 rounded" />
          </div>
          <Skeleton className="h-6 w-28" />
        </div>
      ))}
    </div>
  );
}

/** Grafik: judul + area besar. */
export function SkeletonChart({ height = "h-64", className = "" }: { height?: string; className?: string }) {
  return (
    <div className={`card ${className}`}>
      <Skeleton className="mb-4 h-4 w-40" />
      <Skeleton className={`w-full ${height}`} />
    </div>
  );
}

/** Daftar baris dengan avatar kecil + dua baris teks. */
export function SkeletonList({ rows = 4, className = "" }: { rows?: number; className?: string }) {
  return (
    <div className={`card space-y-4 ${className}`}>
      <Skeleton className="h-4 w-32" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-4 w-14" />
        </div>
      ))}
    </div>
  );
}

/** Tabel: kolom pencarian/filter + header + baris. */
export function SkeletonTable({
  rows = 8,
  cols = 5,
  toolbar = true,
}: {
  rows?: number;
  cols?: number;
  toolbar?: boolean;
}) {
  return (
    <div>
      {toolbar && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <Skeleton className="h-11 w-full max-w-sm rounded-lg" />
          <Skeleton className="h-11 w-36 rounded-lg" />
        </div>
      )}
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="flex gap-4 border-b border-border px-5 py-4">
          {Array.from({ length: cols }, (_, i) => (
            <Skeleton key={i} className="h-3 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-b-0">
            {Array.from({ length: cols }, (_, c) => (
              <Skeleton key={c} className={`h-4 flex-1 ${c === 0 ? "max-w-[10rem]" : ""}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Deretan tombol filter bulat (pill). */
export function SkeletonPills({ count = 5, className = "mb-6" }: { count?: number; className?: string }) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-8 w-20 rounded-full" />
      ))}
    </div>
  );
}

/** Kartu paket harga (halaman Upgrade). */
export function SkeletonPlans({ count = 3 }: { count?: number }) {
  return (
    <div className="card">
      <Skeleton className="h-5 w-44" />
      <Skeleton className="mt-2 h-3.5 w-80 max-w-full" />
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-surface-2 p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-8 w-32" />
            <div className="mt-5 space-y-3">
              {[0, 1, 2, 3].map((j) => (
                <div key={j} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 shrink-0 rounded-full" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
            <Skeleton className="mt-5 h-10 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Kartu sinyal / berita: judul, detail, dan badge. */
export function SkeletonFeedItems({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4">
            {[0, 1, 2].map((j) => (
              <div key={j} className="space-y-2">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Kartu video/pelajaran (Academy). */
export function SkeletonMediaGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card !p-0 overflow-hidden">
          <Skeleton className="aspect-video w-full rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Formulir: beberapa kolom isian + tombol. */
export function SkeletonForm({ fields = 4, className = "" }: { fields?: number; className?: string }) {
  return (
    <div className={`card space-y-5 ${className}`}>
      <Skeleton className="h-5 w-40" />
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
      ))}
      <Skeleton className="h-11 w-36 rounded-full" />
    </div>
  );
}
