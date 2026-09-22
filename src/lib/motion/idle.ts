/**
 * Runs `task` once the page has finished loading and the browser is idle, so nothing here can delay
 * first paint, the largest paint or first input. Returns a function that cancels it.
 */
export function afterLoadAndIdle(task: () => void, timeoutMs = 2500): () => void {
  let cancelled = false;
  let idleHandle: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const schedule = () => {
    if (cancelled) return;
    if ('requestIdleCallback' in window) {
      idleHandle = window.requestIdleCallback(() => !cancelled && task(), { timeout: timeoutMs });
    } else {
      timer = setTimeout(() => !cancelled && task(), 200); // Safari has no requestIdleCallback
    }
  };

  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule, { once: true });

  return () => {
    cancelled = true;
    window.removeEventListener('load', schedule);
    if (idleHandle !== undefined) window.cancelIdleCallback(idleHandle);
    if (timer) clearTimeout(timer);
  };
}

/** True when the visitor has asked their system for less motion. */
export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** True for a mouse or trackpad. Touch screens keep their own native, momentum scrolling. */
export const hasFinePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;
