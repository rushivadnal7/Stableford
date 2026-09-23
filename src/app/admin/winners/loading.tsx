import { Skeleton, SkeletonTable } from '@/components/ui/skeleton';

export default function AdminWinnersLoading() {
  return (
    <div className="container-page py-block">
      <Skeleton className="mb-block h-8 w-32" />
      <div className="mb-4 flex flex-wrap gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-24 rounded-pill" />
        ))}
      </div>
      <div className="mb-block flex flex-wrap gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-20 rounded-pill" />
        ))}
      </div>
      <SkeletonTable rows={6} cols={7} />
    </div>
  );
}
