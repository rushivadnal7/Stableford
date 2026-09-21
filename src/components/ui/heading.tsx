import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Full class names, so Tailwind can see them. Never build `type-${x}` dynamically. */
const VARIANTS = {
  display: 'type-display',
  h1: 'type-h1',
  h2: 'type-h2',
  h3: 'type-h3',
  h4: 'type-h4',
} as const;

type Variant = keyof typeof VARIANTS;
type Level = 'h1' | 'h2' | 'h3' | 'h4';

/**
 * A heading. `as` is the semantic level (for accessibility and SEO), `variant` is how it looks.
 * They are separate on purpose: an h2 can look like an h3 without breaking the outline.
 */
export function Heading({
  as: Tag = 'h2',
  variant,
  className,
  children,
  ...rest
}: { as?: Level; variant?: Variant; children: ReactNode } & HTMLAttributes<HTMLHeadingElement>) {
  return (
    <Tag className={cn(VARIANTS[variant ?? Tag], 'text-fg', className)} {...rest}>
      {children}
    </Tag>
  );
}

/** The small mono label above a heading. */
export function Eyebrow({ className, children }: { className?: string; children: ReactNode }) {
  return <p className={cn('type-eyebrow', className)}>{children}</p>;
}

/** One emphasised word inside a heading: italic serif in the readable accent colour. */
export function Accent({ children }: { children: ReactNode }) {
  return <em className="type-serif text-accent-text">{children}</em>;
}

/** Renders a { before, accent, after } title from src/content with the accent word in italic serif. */
export function RichTitle({ before, accent, after }: { before: string; accent: string; after?: string }) {
  return (
    <>
      {before}
      <Accent>{accent}</Accent>
      {after}
    </>
  );
}

/** Eyebrow, heading and lead, laid out the same way in every section. */
export function SectionHeader({
  eyebrow,
  title,
  lead,
  align = 'left',
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  align?: 'left' | 'center';
  className?: string;
}) {
  return (
    <header className={cn('flex flex-col gap-4', align === 'center' && 'mx-auto items-center text-center', className)}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <Heading as="h2" className="max-w-narrow">
        {title}
      </Heading>
      {lead && <p className="type-lead max-w-copy">{lead}</p>}
    </header>
  );
}
