'use client';

import { useEffect } from 'react';
import { afterLoadAndIdle, hasFinePointer, prefersReducedMotion } from '@/lib/motion/idle';

/**
 * Smooth, inertial scrolling for mouse and trackpad users, started after the page has loaded.
 * Touch screens keep native momentum scrolling, and anyone who asked for reduced motion keeps plain scrolling.
 * Renders nothing; the code is a separate chunk, fetched only when it will be used.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion() || !hasFinePointer()) return;
    let stop: (() => void) | undefined;
    let cancelled = false;

    const cancelIdle = afterLoadAndIdle(() => {
      void import('@/lib/motion/smooth-scroll').then(({ startSmoothScroll }) =>
        startSmoothScroll().then((undo) => {
          if (cancelled) undo();
          else stop = undo;
        }),
      );
    });

    return () => {
      cancelled = true;
      cancelIdle();
      stop?.();
    };
  }, []);

  return null;
}
