import { SkeletonPage, SkeletonPills, SkeletonTable } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonPills count={2} className="mb-4" />
      <SkeletonTable rows={8} cols={6} toolbar={false} />
    </SkeletonPage>
  );
}
