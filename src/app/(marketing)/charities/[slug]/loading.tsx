import { Grid, Stack } from '@/components/ui/layout';
import { Skeleton, SkeletonCard, SkeletonText } from '@/components/ui/skeleton';

export default function CharityDetailLoading() {
  return (
    <div className="container-page py-block">
      <Skeleton className="mb-block h-4 w-28" />

      <Grid cols={2} className="items-start">
        <Skeleton className="aspect-4/3 w-full rounded-3xl" />
        <Stack gap="lg">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-12 w-4/5" />
          <SkeletonText lines={3} />
          <Skeleton className="h-14 w-56 rounded-pill" />
        </Stack>
      </Grid>

      <div className="mt-block">
        <Skeleton className="h-6 w-40" />
        <Grid cols={3} className="mt-block">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </Grid>
      </div>

      <div className="mt-block max-w-copy">
        <SkeletonCard lines={2} />
      </div>
    </div>
  );
}
