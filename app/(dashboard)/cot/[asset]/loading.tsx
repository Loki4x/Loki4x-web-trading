import { SkeletonPage, SkeletonChart, SkeletonTable } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage back>
      <SkeletonChart className="mb-6" />
      <SkeletonTable rows={6} cols={5} toolbar={false} />
    </SkeletonPage>
  );
}
