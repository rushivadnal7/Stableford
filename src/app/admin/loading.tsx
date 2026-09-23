import { Skeleton, SkeletonStatGrid, SkeletonTable } from '@/components/ui/skeleton';

export default function AdminOverviewLoading() {
  return (
    <div className="container-page py-block">
      <Skeleton className="mb-block h-8 w-56" />
      <SkeletonStatGrid n={9} />
      <Skeleton className="mt-block mb-4 h-6 w-48" />
      <SkeletonTable rows={4} cols={4} />
      <Skeleton className="mt-block mb-4 h-6 w-48" />
      <SkeletonTable rows={4} cols={3} />
      <Skeleton className="mt-block mb-4 h-6 w-48" />
      <SkeletonTable rows={6} cols={4} />
    </div>
  );
}
