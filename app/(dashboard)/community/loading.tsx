import { SkeletonPage, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage>
      <Skeleton className="h-10 w-72 rounded-full" />
      <div className="card mt-4 space-y-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-3/4 rounded-2xl" />
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
