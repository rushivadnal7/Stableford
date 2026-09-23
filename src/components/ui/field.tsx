import * as RadixSelect from '@radix-ui/react-select';
import { cva } from 'class-variance-authority';
import { Check, ChevronDown } from 'lucide-react';
import { Children, isValidElement, type ComponentProps, type OptionHTMLAttributes, type ReactElement, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/**
 * Form primitives: one visual language for every input in the product (signup, login, the
 * dashboard's score and giving forms). Sizing matches the buttons (h-12 / h-touch) so a field next
 * to a button lines up, and every control shares one focus and error treatment.
 */
export const controlStyles = cva(
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

/** A Radix Select value can never be the empty string, so a placeholder `<option value="">` maps to this internally. */
const EMPTY_OPTION = '__select_empty__';

/**
 * A fully custom dropdown, not the browser's native one — built on Radix's unstyled Select so keyboard
 * nav, typeahead and screen-reader semantics stay correct (that part is genuinely easy to get wrong by
 * hand). The public API still looks like a plain `<select>` (`value`, `onChange`, `<option>` children),
 * so every existing call site keeps working unchanged.
 */
export function Select({
  invalid,
  className,
  children,
  value,
  onChange,
  id,
  disabled,
  required,
  'aria-label': ariaLabel,
}: {
  invalid?: boolean;
  className?: string;
  children: ReactNode;
  value: string;
  onChange: (event: { target: { value: string } }) => void;
  id?: string;
  disabled?: boolean;
  required?: boolean;
  'aria-label'?: string;
}) {
  const options = Children.toArray(children).filter(isValidElement) as ReactElement<OptionHTMLAttributes<HTMLOptionElement>>[];

  return (
    <RadixSelect.Root
      value={value === '' ? EMPTY_OPTION : value}
      onValueChange={(next) => onChange({ target: { value: next === EMPTY_OPTION ? '' : next } })}
      disabled={disabled}
      required={required}
    >
      <RadixSelect.Trigger
        id={id}
        aria-invalid={invalid}
        aria-label={ariaLabel}
        className={cn(controlStyles({ invalid }), 'inline-flex cursor-pointer items-center justify-between gap-2 pr-4 data-placeholder:text-fg-muted', className)}
      >
        <RadixSelect.Value />
        <RadixSelect.Icon asChild>
          <ChevronDown aria-hidden className="size-4 shrink-0 text-fg-muted" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={6}
          className="z-overlay w-(--radix-select-trigger-width) overflow-hidden rounded-lg border border-line bg-surface shadow-lift"
        >
          <RadixSelect.Viewport className="max-h-72 p-1">
            {options.map((option) => {
              const raw = String(option.props.value ?? '');
              const itemValue = raw === '' ? EMPTY_OPTION : raw;
              return (
                <RadixSelect.Item
                  key={itemValue}
                  value={itemValue}
                  disabled={option.props.disabled}
                  className="type-body flex min-h-touch cursor-pointer items-center justify-between gap-2 rounded-md px-3 text-fg outline-none transition-colors motion-fast data-highlighted:bg-canvas-alt data-disabled:pointer-events-none data-disabled:opacity-50"
                >
                  <RadixSelect.ItemText>{option.props.children}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator>
                    <Check aria-hidden className="size-4 text-accent-text" />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              );
            })}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
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
