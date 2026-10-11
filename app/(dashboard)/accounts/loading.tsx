import { SkeletonPage, Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage>
      <Skeleton className="mb-6 h-10 w-40 rounded-full" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <SkeletonCard key={i} titleWidth="w-32">
            <Skeleton className="h-7 w-36" />
            <Skeleton className="mt-4 h-3.5 w-24" />
            <Skeleton className="mt-2 h-3.5 w-28" />
          </SkeletonCard>
        ))}
      </div>
    </SkeletonPage>
  );
}
