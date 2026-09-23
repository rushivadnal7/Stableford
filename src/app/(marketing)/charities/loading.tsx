import { Skeleton, SkeletonCardGrid } from '@/components/ui/skeleton';

export default function CharitiesLoading() {
  return (
    <div className="container-page py-block">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-10 w-2/3 max-w-md" />
      <Skeleton className="mt-4 h-5 w-full max-w-lg" />

      <Skeleton className="mt-block h-12 w-full" />
      <div className="mt-block flex flex-wrap gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-24 rounded-pill" />
        ))}
      </div>

      <SkeletonCardGrid n={9} className="mt-block" />
    </div>
  );
}
