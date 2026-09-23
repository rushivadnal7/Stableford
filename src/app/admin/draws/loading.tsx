import { Skeleton, SkeletonTable } from '@/components/ui/skeleton';

export default function AdminDrawsLoading() {
  return (
    <div className="container-page py-block">
      <Skeleton className="mb-block h-8 w-36" />
      <Skeleton className="mb-block h-12 w-48 rounded-pill" />
      <SkeletonTable rows={6} cols={5} />
    </div>
  );
}
