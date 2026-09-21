import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * LAYOUT PRIMITIVES: the only place responsive columns and gaps are written.
 *
 * Pages and sections compose these instead of writing grid-cols-*, col-span-* or gap-* themselves
 * (theme.test.ts enforces it). Each is mobile first: the phone layout is the default, and columns
 * appear at sm / md / lg. Gaps come from fluid tokens, so they need no breakpoint of their own.
 * Class names are written out in full so Tailwind can find them.
 */

/** Gaps for stacked content, on the 4px grid. */
const GAPS = { xs: 'gap-2', sm: 'gap-3', md: 'gap-4', lg: 'gap-6', xl: 'gap-8' } as const;
export type Gap = keyof typeof GAPS;

type BoxProps = { as?: ElementType; className?: string; children: ReactNode } & HTMLAttributes<HTMLElement>;

/** Children in a column with an even gap. */
export function Stack({ as: Tag = 'div', gap = 'md', className, children, ...rest }: BoxProps & { gap?: Gap }) {
  return (
    <Tag className={cn('flex flex-col', GAPS[gap], className)} {...rest}>
      {children}
    </Tag>
  );
}

const JUSTIFY = { start: 'justify-start', center: 'justify-center', between: 'justify-between' } as const;

/** Children in a row that wraps onto new lines when it runs out of room (buttons, badges, chips). */
export function Cluster({ as: Tag = 'div', gap = 'md', justify = 'start', className, children, ...rest }: BoxProps & { gap?: Gap; justify?: keyof typeof JUSTIFY }) {
  return (
    <Tag className={cn('flex flex-wrap items-center', GAPS[gap], JUSTIFY[justify], className)} {...rest}>
      {children}
    </Tag>
  );
}

const COLUMNS = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
} as const;

/**
 * Equal cards. One column on a phone; `cols` is the count on a laptop, with a two-column step between
 * (except `2`, which stays one column until md).
 */
export function Grid({ as: Tag = 'div', cols = 3, className, children, ...rest }: BoxProps & { cols?: keyof typeof COLUMNS }) {
  return (
    <Tag className={cn('grid gap-grid', COLUMNS[cols], className)} {...rest}>
      {children}
    </Tag>
  );
}

const RATIOS = {
  '6-6': ['lg:col-span-6', 'lg:col-span-6'],
  '5-7': ['lg:col-span-5', 'lg:col-span-7'],
  '7-5': ['lg:col-span-7', 'lg:col-span-5'],
  '4-8': ['lg:col-span-4', 'lg:col-span-8'],
} as const;

const ALIGN = { center: 'lg:items-center', start: 'lg:items-start' } as const;

/**
 * Two columns side by side on a laptop, stacked on anything smaller (first, then second).
 * `ratio` is how the 12-column width divides.
 */
export function Split({
  ratio = '6-6',
  align = 'center',
  first,
  second,
  className,
}: {
  ratio?: keyof typeof RATIOS;
  align?: keyof typeof ALIGN;
  first: ReactNode;
  second: ReactNode;
  className?: string;
}) {
  const [a, b] = RATIOS[ratio];
  return (
    <div className={cn('grid grid-cols-1 gap-split lg:grid-cols-12', ALIGN[align], className)}>
      <div className={cn('min-w-0', a)}>{first}</div>
      <div className={cn('min-w-0', b)}>{second}</div>
    </div>
  );
}
