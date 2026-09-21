import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Every button in the product is one of these variants and sizes. Add a variant here, not in a page. */
export const buttonStyles = cva(
  [
    'group/button inline-flex items-center justify-center gap-2 rounded-pill whitespace-nowrap select-none',
    'transition-[transform,background-color,box-shadow,color,border-color] motion-base',
    'disabled:pointer-events-none disabled:opacity-50',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-action text-on-action shadow-soft hover:-translate-y-0.5 hover:bg-action-hover hover:shadow-lift active:translate-y-0',
        secondary: 'border border-line-strong text-fg hover:border-fg hover:bg-fg/5',
        ghost: 'text-fg hover:bg-fg/8',
      },
      size: {
        // Every size is at least 44px tall (h-touch), the minimum for something you tap.
        sm: 'h-touch px-4 type-label',
        md: 'h-12 px-6 type-label',
        lg: 'h-14 px-8 type-label-lg',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

type Style = VariantProps<typeof buttonStyles>;

const ArrowIcon = () => (
  <ArrowRight aria-hidden className="size-4 transition-transform motion-base group-hover/button:translate-x-1" />
);

type LinkProps = Style &
  Omit<ComponentProps<typeof Link>, 'href' | 'children'> & { href: string; arrow?: boolean; children: ReactNode };

/** A link that looks like a button. */
export function ButtonLink({ variant, size, arrow, href, className, children, ...rest }: LinkProps) {
  return (
    <Link href={href} className={cn(buttonStyles({ variant, size }), className)} {...rest}>
      {children}
      {arrow && <ArrowIcon />}
    </Link>
  );
}

type NativeProps = Style & ButtonHTMLAttributes<HTMLButtonElement> & { arrow?: boolean };

/** A real <button>, for actions rather than navigation. */
export function Button({ variant, size, arrow, className, children, type = 'button', ...rest }: NativeProps) {
  return (
    <button type={type} className={cn(buttonStyles({ variant, size }), className)} {...rest}>
      {children}
      {arrow && <ArrowIcon />}
    </button>
  );
}
