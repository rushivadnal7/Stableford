import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/**
 * A plain, readable data table for the admin area: rows of members, draws, winners. Horizontally
 * scrollable on a phone (the wrapper), rather than trying to reflow columns, which real tabular
 * data rarely survives.
 */
export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="-mx-inset overflow-x-auto px-inset sm:mx-0 sm:px-0">
      <table className={cn('w-full min-w-full border-collapse text-left', className)}>{children}</table>
    </div>
  );
}

export function Thead({ children }: { children: ReactNode }) {
  return <thead className="border-b border-line-strong">{children}</thead>;
}

export function Tbody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-line">{children}</tbody>;
}

export function Tr({ children, className }: { children: ReactNode; className?: string }) {
  return <tr className={cn('align-middle', className)}>{children}</tr>;
}

export function Th({ children, className, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th scope="col" className={cn('type-label whitespace-nowrap px-3 py-3 text-fg-muted first:pl-0 last:pr-0', className)} {...rest}>
      {children}
    </th>
  );
}

export function Td({ children, className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('type-body px-3 py-3 text-fg first:pl-0 last:pr-0', className)} {...rest}>
      {children}
    </td>
  );
}

/** Shown instead of the table body when there is nothing to list yet. */
export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="type-body px-3 py-10 text-center text-fg-muted">
        {children}
      </td>
    </tr>
  );
}
