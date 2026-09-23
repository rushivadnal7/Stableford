import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const cardStyles = cva('rounded-xl border p-card', {
  variants: {
    variant: {
      surface: 'border-line bg-surface shadow-soft',
      glass: 'border-glass-line bg-glass backdrop-blur-md',
      flat: 'border-transparent bg-canvas-alt',
    },
    interactive: {
      true: 'transition-[box-shadow,border-color] motion-base hover:border-line-strong hover:shadow-lift',
    },
  },
  defaultVariants: { variant: 'surface' },
});

export function Card({ variant, interactive, className, ...rest }: VariantProps<typeof cardStyles> & HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(cardStyles({ variant, interactive }), className)} {...rest} />;
}

const badgeStyles = cva('inline-flex items-center gap-1.5 rounded-pill border px-3 py-1 type-caption font-medium', {
  variants: {
    variant: {
      neutral: 'border-line bg-canvas-alt text-fg',
      accent: 'border-accent/40 bg-accent/15 text-accent-text',
      glass: 'border-glass-line bg-glass text-fg backdrop-blur-md',
    },
  },
  defaultVariants: { variant: 'neutral' },
});

export function Badge({ variant, className, ...rest }: VariantProps<typeof badgeStyles> & HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn(badgeStyles({ variant }), className)} {...rest} />;
}
