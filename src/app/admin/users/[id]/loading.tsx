import { Grid, Stack } from '@/components/ui/layout';
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton';

export default function AdminUserDetailLoading() {
  return (
    <div className="container-page py-block">
      <Skeleton className="mb-block h-4 w-24" />
      <Skeleton className="h-10 w-64" />
      <Skeleton className="mt-2 mb-block h-4 w-48" />

      <Grid cols={2} className="items-start">
        <Stack gap="lg">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </Stack>
        <Stack gap="lg">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </Stack>
      </Grid>
    </div>
  );
}
