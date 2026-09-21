import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'canvas' | 'alt' | 'dark';

/** Full class names, so Tailwind can see them. */
const TONES: Record<Tone, string> = {
  canvas: 'bg-canvas',
  alt: 'bg-canvas-alt',
  dark: 'bg-canvas',
};

/**
 * A page section: consistent vertical rhythm, side padding and background.
 * `tone="dark"` switches the whole subtree to the dark theme (colours are roles, so nothing else changes).
 */
export function Section({
  tone = 'canvas',
  id,
  className,
  contained = true,
  children,
}: {
  tone?: Tone;
  id?: string;
  className?: string;
  contained?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      data-theme={tone === 'dark' ? 'dark' : undefined}
      className={cn('section-y scroll-mt-header text-fg', TONES[tone], className)}
    >
      {contained ? <div className="container-page">{children}</div> : children}
    </section>
  );
}

const PANEL_BACKGROUNDS = {
  hero: 'bg-hero',
  cta: 'bg-cta',
  solid: 'bg-canvas',
} as const;

/** A large rounded dark panel inset from the page edge (hero, closing call to action, footer). */
export function Panel({
  as: Tag = 'div',
  background = 'hero',
  className,
  children,
}: {
  as?: ElementType;
  background?: keyof typeof PANEL_BACKGROUNDS;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag
      data-theme="dark"
      className={cn('relative isolate mx-inset overflow-hidden rounded-3xl text-fg', PANEL_BACKGROUNDS[background], className)}
    >
      {children}
    </Tag>
  );
}
