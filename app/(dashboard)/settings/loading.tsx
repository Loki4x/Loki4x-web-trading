import { SkeletonPage, SkeletonForm, Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage>
      <div className="flex flex-col gap-6">
        <div className="card flex items-center gap-4">
          <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3.5 w-56 max-w-full" />
          </div>
        </div>
        <SkeletonForm fields={3} />
        <SkeletonCard titleWidth="w-44">
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        </SkeletonCard>
      </div>
    </SkeletonPage>
  );
}
