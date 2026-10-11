import { SkeletonPage, SkeletonKpiRow, SkeletonChart, SkeletonList } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonKpiRow />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SkeletonChart className="lg:col-span-2" height="h-72" />
        <div className="flex flex-col gap-6">
          <SkeletonList rows={3} />
          <SkeletonList rows={3} />
        </div>
      </div>
    </SkeletonPage>
  );
}
