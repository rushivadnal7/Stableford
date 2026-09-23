import { Grid, Stack } from '@/components/ui/layout';
import { Card } from '@/components/ui/surface';
import { cn } from '@/lib/cn';

/** One placeholder block. Every shape below is built from this. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-canvas-alt', className)} />;
}

/** A run of text lines, the last one shorter so it reads like a paragraph, not a bar chart. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <Stack gap="sm" className={className}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn('h-4', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </Stack>
  );
}

/** The shape of one of our Card-wrapped panels: a title, then a few lines. */
export function SkeletonCard({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <Card className={className}>
      <Stack gap="lg">
        <Skeleton className="h-5 w-1/3" />
        <SkeletonText lines={lines} />
      </Stack>
    </Card>
  );
}

/** A row of stat tiles, matching the admin overview's number grid. */
export function SkeletonStatGrid({ n = 6, className }: { n?: number; className?: string }) {
  return (
    <Grid cols={3} className={className}>
      {Array.from({ length: n }, (_, i) => (
        <Card key={i}>
          <Stack gap="sm">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-7 w-2/3" />
          </Stack>
        </Card>
      ))}
    </Grid>
  );
}

/** A data table: a header row and a few body rows, each cell a bar of varying width. */
export function SkeletonTable({ rows = 5, cols = 4, className }: { rows?: number; cols?: number; className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-lg border border-line', className)}>
      <div className="flex gap-4 border-b border-line bg-canvas-alt px-4 py-3">
        {Array.from({ length: cols }, (_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      <div>
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex items-center gap-4 border-b border-line px-4 py-4 last:border-b-0">
            {Array.from({ length: cols }, (_, c) => (
              <Skeleton key={c} className={cn('h-4 flex-1', c === 0 && 'max-w-40')} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** A grid of image-card tiles: the charity directory, the home page's charity spotlight. */
export function SkeletonCardGrid({ n = 6, className }: { n?: number; className?: string }) {
  return (
    <Grid as="ul" cols={3} className={className}>
      {Array.from({ length: n }, (_, i) => (
        <li key={i}>
          <Card className="flex h-full flex-col gap-5 p-4">
            <Skeleton className="h-36 w-full rounded-lg" />
            <Stack gap="sm" className="px-2 pb-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-5 w-2/3" />
              <SkeletonText lines={2} />
            </Stack>
          </Card>
        </li>
      ))}
    </Grid>
  );
}
