'use client';

import { useEffect } from 'react';
import { afterLoadAndIdle, prefersReducedMotion } from '@/lib/motion/idle';

/**
 * Starts the hero's scroll story after the page has loaded. Renders nothing.
 *
 * The hero is fully server-rendered and readable on its own. This only adds the motion, and only when the
 * visitor has not asked for less of it. The code (GSAP, and three.js behind it) is a separate chunk that is
 * fetched now, not as part of the first page load, so it cannot delay the first paint or the largest paint.
 */
export function StoryLoader() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('[data-hero]');
    if (!root || prefersReducedMotion()) return;

    let stop: (() => void) | undefined;
    let cancelled = false;
    const cancelIdle = afterLoadAndIdle(() => {
      void import('@/lib/scene/hero-story').then(({ startHeroStory }) =>
        startHeroStory(root).then((undo) => {
          if (cancelled) undo();
          else stop = undo;
        }),
      );
    }, 1500);

    return () => {
      cancelled = true;
      cancelIdle();
      stop?.();
    };
  }, []);

  return null;
}
