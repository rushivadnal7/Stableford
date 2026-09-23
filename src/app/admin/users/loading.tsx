import { Skeleton, SkeletonTable } from '@/components/ui/skeleton';

export default function AdminUsersLoading() {
  return (
    <div className="container-page py-block">
      <Skeleton className="mb-block h-8 w-40" />
      <Skeleton className="mb-block h-12 w-full max-w-md" />
      <SkeletonTable rows={8} cols={5} />
    </div>
  );
}
