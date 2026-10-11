import { SkeletonPage, SkeletonPills, SkeletonKpiRow, SkeletonFeedItems } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonPills count={2} className="mb-4" />
      <SkeletonPills count={6} />
      <SkeletonKpiRow />
      <SkeletonFeedItems rows={4} />
    </SkeletonPage>
  );
}
