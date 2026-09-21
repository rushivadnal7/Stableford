'use client';

import { useEffect, useRef, type CSSProperties, type ElementType, type ReactNode } from 'react';

/**
 * Fades its content up when it first scrolls into view. The animation lives in styles/motion.css;
 * this only flips a data attribute.
 *
 * It never hides anything up front: the server-rendered page is fully visible. Only after the page
 * has loaded are elements that are still below the fold set to "pending", and revealed as they come
 * into view. So without JavaScript, with reduced motion, in print, or for a crawler, nothing is hidden.
 * `delay` staggers siblings, in milliseconds.
 */
export function Reveal({
  as: Tag = 'div',
  delay = 0,
  className,
  children,
}: {
  as?: ElementType;
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return; // already on screen: leave it be

    el.dataset.reveal = 'pending';
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          el.dataset.reveal = 'shown';
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag ref={ref} style={{ '--reveal-delay': `${delay}ms` } as CSSProperties} className={className}>
      {children}
    </Tag>
  );
}
