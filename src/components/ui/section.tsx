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
 * A page section: the same vertical rhythm, side padding and content width everywhere.
 * `header` (usually a <SectionHeader>) sits above the content with the standard gap between them.
 * `tone="dark"` switches the whole subtree to the dark theme (colours are roles, so nothing else changes).
 */
export function Section({
  tone = 'canvas',
  id,
  className,
  contained = true,
  header,
  children,
}: {
  tone?: Tone;
  id?: string;
  className?: string;
  contained?: boolean;
  header?: ReactNode;
  children: ReactNode;
}) {
  const content = (
    <>
      {header}
      {header ? <div className="mt-block">{children}</div> : children}
    </>
  );

  return (
    <section
      id={id}
      data-theme={tone === 'dark' ? 'dark' : undefined}
      className={cn('section-y text-fg', TONES[tone], className)}
    >
      {contained ? <div className="container-page">{content}</div> : content}
    </section>
  );
}

const PANEL_BACKGROUNDS = {
  hero: 'bg-hero',
  cta: 'bg-cta',
  solid: 'bg-canvas',
} as const;

/**
 * A large rounded dark panel inset from the page edge (hero, closing call to action, footer).
 * The inset is kept at every width, and the panel stops growing on very large screens.
 */
export function Panel({
  as: Tag = 'div',
  background = 'hero',
  contained = true,
  className,
  children,
}: {
  as?: ElementType;
  background?: keyof typeof PANEL_BACKGROUNDS;
  contained?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className="px-inset">
      <Tag
        data-theme="dark"
        className={cn('relative isolate mx-auto max-w-wide overflow-hidden rounded-3xl py-panel text-fg', PANEL_BACKGROUNDS[background], className)}
      >
        {contained ? <div className="container-page">{children}</div> : children}
      </Tag>
    </div>
  );
}
