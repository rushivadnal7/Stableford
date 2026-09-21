import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/** The semantic type styles from styles/utilities.css. Only one may apply to an element. */
const TYPE_STYLES = ['display', 'h1', 'h2', 'h3', 'h4', 'lead', 'body', 'small', 'caption', 'label', 'label-lg', 'eyebrow', 'num', 'serif'];

const merge = extendTailwindMerge<'type-style'>({
  extend: { classGroups: { 'type-style': [{ type: TYPE_STYLES }] } },
});

/** Join class names and resolve conflicts, so a caller's className can override a component's default. */
export function cn(...inputs: ClassValue[]): string {
  return merge(clsx(inputs));
}
