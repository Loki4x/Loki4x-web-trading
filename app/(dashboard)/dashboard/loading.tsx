import { SkeletonPage, SkeletonTopbar, Skeleton, SkeletonKpiRow, SkeletonChart, SkeletonList } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div>
      <SkeletonTopbar />
      <SkeletonPage title={false}>
        <Skeleton className="mb-6 h-14 w-full rounded-xl" />
        <div className="mb-4 flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3.5 w-32" />
          </div>
          <Skeleton className="h-4 w-36" />
        </div>
        <SkeletonKpiRow />
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <SkeletonChart className="lg:col-span-2" />
          <SkeletonList rows={3} />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SkeletonList rows={3} />
          <SkeletonList rows={3} />
        </div>
      </SkeletonPage>
    </div>
  );
}
