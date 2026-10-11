import { SkeletonPage, Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonCard titleWidth="w-36">
        <Skeleton className="h-11 w-full rounded-lg" />
        <Skeleton className="mt-3 h-10 w-32 rounded-full" />
      </SkeletonCard>
      <SkeletonCard className="mt-4" titleWidth="w-40">
        <Skeleton className="h-3 w-full rounded-full" />
      </SkeletonCard>
      <div className="mt-4 grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card !p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-6 w-12" />
          </div>
        ))}
      </div>
      <SkeletonCard className="mt-4" titleWidth="w-28">
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-3.5 w-full" />
          ))}
        </div>
      </SkeletonCard>
    </SkeletonPage>
  );
}
