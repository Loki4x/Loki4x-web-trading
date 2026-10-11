import { SkeletonPage, SkeletonPlans } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonPlans />
    </SkeletonPage>
  );
}
