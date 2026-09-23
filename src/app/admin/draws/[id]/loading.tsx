import { Grid } from '@/components/ui/layout';
import { Skeleton, SkeletonCard, SkeletonTable } from '@/components/ui/skeleton';

export default function AdminDrawDetailLoading() {
  return (
    <div className="container-page py-block">
      <Skeleton className="mb-block h-4 w-24" />
      <Skeleton className="mb-block h-10 w-40" />
      <Grid cols={2}>
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
      </Grid>
      <Skeleton className="mt-block mb-4 h-6 w-40" />
      <SkeletonTable rows={5} cols={4} />
    </div>
  );
}
