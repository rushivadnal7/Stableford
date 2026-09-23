import { Grid, Stack } from '@/components/ui/layout';
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="container-page py-block">
      <Skeleton className="mb-block h-4 w-48" />
      <Grid cols={2} className="items-start">
        <Stack gap="lg">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={3} />
          <SkeletonCard lines={2} />
        </Stack>
        <Stack gap="lg">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={3} />
          <SkeletonCard lines={2} />
        </Stack>
      </Grid>
    </div>
  );
}
