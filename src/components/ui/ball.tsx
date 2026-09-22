import { cn } from '@/lib/cn';

/** Full class names, so Tailwind can see them. */
const TONES = {
  accent: 'bg-accent text-on-accent',
  warm: 'bg-warm text-on-accent',
  outline: 'border border-line-strong text-fg',
  glass: 'border border-glass-line bg-glass text-fg backdrop-blur-md',
} as const;

const SIZES = {
  sm: 'size-9 text-sm',
  md: 'size-12 text-base',
  lg: 'size-16 text-xl',
} as const;

/** A draw ball: the visual motif for scores and drawn numbers. */
export function Ball({
  n,
  tone = 'outline',
  size = 'md',
  className,
}: {
  n: number;
  tone?: keyof typeof TONES;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-pill type-num transition-transform motion-base hover:scale-110',
        TONES[tone],
        SIZES[size],
        className,
      )}
    >
      {n}
    </span>
  );
}
