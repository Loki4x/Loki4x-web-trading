import { SkeletonPage, SkeletonMediaGrid } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonMediaGrid count={6} />
    </SkeletonPage>
  );
}
