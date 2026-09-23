import { Skeleton, SkeletonTable } from '@/components/ui/skeleton';

export default function AdminCharitiesLoading() {
  return (
    <div className="container-page py-block">
      <Skeleton className="mb-block h-8 w-44" />
      <Skeleton className="mb-block h-12 w-40 rounded-pill" />
      <SkeletonTable rows={6} cols={4} />
    </div>
  );
}
