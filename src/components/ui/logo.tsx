import { cn } from '@/lib/cn';
import { SITE } from '@/lib/site';

/**
 * Two overlapping circles: two draw balls, and a share that is given away. Colours come from the theme.
 * Drifts apart very slightly on hover, when a `group` ancestor (the home link in the header) is hovered.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn('size-8 shrink-0', className)}>
      <circle cx="12" cy="16" r="10" className="fill-accent transition-transform motion-slow group-hover:-translate-x-0.5" />
      <circle cx="20" cy="16" r="10" className="fill-warm mix-blend-multiply transition-transform motion-slow group-hover:translate-x-0.5" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5 text-fg', className)}>
      <LogoMark />
      <span className="type-h4 tracking-tight">
        {SITE.name.slice(0, -4)}
        <em className="type-serif">{SITE.name.slice(-4)}</em>
      </span>
    </span>
  );
}
