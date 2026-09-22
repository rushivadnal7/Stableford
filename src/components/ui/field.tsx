import { cva } from 'class-variance-authority';
import { ChevronDown } from 'lucide-react';
import type { ComponentProps, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/**
 * Form primitives: one visual language for every input in the product (signup, login, the
 * dashboard's score and giving forms). Sizing matches the buttons (h-12 / h-touch) so a field next
 * to a button lines up, and every control shares one focus and error treatment.
 */
const controlStyles = cva(
  [
    'h-12 w-full rounded-lg border bg-surface px-4 type-body text-fg outline-none',
    'transition-colors motion-base placeholder:text-fg-muted',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ],
  {
    variants: {
      invalid: {
        true: 'border-danger focus:border-danger',
        false: 'border-line focus:border-action',
      },
    },
    defaultVariants: { invalid: false },
  },
);

/** Label, control and helper/error text, laid out the same way everywhere. Pass the control as children. */
export function Field({
  label,
  hint,
  error,
  htmlFor,
  required,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="type-label text-fg">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-1 text-danger">
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p role="alert" className="type-small text-danger">
          {error}
        </p>
      ) : (
        hint && <p className="type-small text-fg-muted">{hint}</p>
      )}
    </div>
  );
}

export function TextInput({ invalid, className, ...rest }: ComponentProps<'input'> & { invalid?: boolean }) {
  return <input className={cn(controlStyles({ invalid }), className)} aria-invalid={invalid} {...rest} />;
}

export function Textarea({
  invalid,
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea className={cn(controlStyles({ invalid }), 'h-auto min-h-24 resize-y py-3', className)} aria-invalid={invalid} {...rest} />;
}

export function Select({
  invalid,
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <div className={cn('relative', className)}>
      <select className={cn(controlStyles({ invalid }), 'cursor-pointer appearance-none pr-11')} aria-invalid={invalid} {...rest}>
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-fg-muted" />
    </div>
  );
}

/** A single checkbox with its label as one clickable row (terms acceptance, feature toggles). */
export function Checkbox({ label, className, ...rest }: ComponentProps<'input'> & { label: ReactNode }) {
  return (
    <label className={cn('flex min-h-touch cursor-pointer items-start gap-3 type-body text-fg', className)}>
      <input type="checkbox" className="mt-0.5 size-5 shrink-0 cursor-pointer rounded-sm border-line-strong accent-action" {...rest} />
      {label}
    </label>
  );
}

/** A short, unobtrusive form-level message: a failed submission, or a success state. */
export function FormNotice({ tone = 'danger', children }: { tone?: 'danger' | 'success'; children: ReactNode }) {
  return (
    <p
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'type-small rounded-lg border px-4 py-3',
        tone === 'danger' ? 'border-danger/30 bg-danger/10 text-danger' : 'border-success/30 bg-success/10 text-success',
      )}
    >
      {children}
    </p>
  );
}
