import { SkeletonPage, Skeleton, SkeletonKpiRow, SkeletonChart, SkeletonTable } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage>
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <Skeleton className="h-10 w-36 rounded-full" />
      </div>
      <SkeletonKpiRow />
      <SkeletonChart className="mb-6" height="h-56" />
      <SkeletonTable rows={6} cols={6} toolbar={false} />
    </SkeletonPage>
  );
}
