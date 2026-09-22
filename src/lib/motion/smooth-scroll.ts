import { loadMotion } from './gsap';

type LenisInstance = InstanceType<typeof import('lenis').default>;

let current: LenisInstance | undefined;

/** The active Lenis instance, if smooth scrolling is running. */
export const smoothScroller = () => current;

/**
 * Turns on inertial smooth scrolling (Lenis) and keeps GSAP's ScrollTrigger in step with it:
 * one requestAnimationFrame loop, owned by GSAP's ticker, drives both. Returns a function that undoes it all.
 */
export async function startSmoothScroll(): Promise<() => void> {
  if (current) return () => {};
  const [{ default: Lenis }, { gsap, ScrollTrigger }] = await Promise.all([import('lenis'), loadMotion()]);
  const lenis = new Lenis({ autoRaf: false, lerp: 0.09, smoothWheel: true, syncTouch: false });
  current = lenis;

  lenis.on('scroll', ScrollTrigger.update);
  const tick = (seconds: number) => lenis.raf(seconds * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0); // never "catch up" after a slow frame: it would make the scroll jump

  // Links to a place on this page glide there, stopping just under the header.
  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!link || link.target === '_blank') return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || url.hash.length < 2) return;
    const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!target) return;
    event.preventDefault();
    const offset = -(parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0);
    lenis.scrollTo(target, { offset, duration: 1.5 });
    history.pushState(null, '', url.hash);
  };
  // Capture phase: run before Next's <Link> so it does not also jump to the hash.
  document.addEventListener('click', onClick, { capture: true });

  return () => {
    document.removeEventListener('click', onClick, { capture: true });
    gsap.ticker.remove(tick);
    lenis.destroy();
    current = undefined;
  };
}
