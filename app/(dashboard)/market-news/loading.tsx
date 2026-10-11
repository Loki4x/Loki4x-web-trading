import { SkeletonPage, SkeletonPills, SkeletonList } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonPills count={4} />
      <SkeletonList rows={6} />
    </SkeletonPage>
  );
}
