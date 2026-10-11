import { SkeletonPage, SkeletonTable } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <SkeletonPage>
      <SkeletonTable rows={8} cols={5} />
    </SkeletonPage>
  );
}
