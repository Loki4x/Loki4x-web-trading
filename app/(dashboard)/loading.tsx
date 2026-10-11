import { SkeletonPage, SkeletonKpiRow, SkeletonChart } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonKpiRow />
      <SkeletonChart />
    </SkeletonPage>
  );
}
