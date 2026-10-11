import { SkeletonPage, SkeletonForm, SkeletonCard, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SkeletonForm fields={5} />
        <SkeletonCard titleWidth="w-32">
          <Skeleton className="h-12 w-40" />
          <div className="mt-6 space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </SkeletonCard>
      </div>
    </SkeletonPage>
  );
}
