import { loadMotion } from '@/lib/motion/gsap';
import { afterLoadAndIdle, hasFinePointer } from '@/lib/motion/idle';
import { canRunScene } from './capability';
import type { HeroScene } from './hero-scene';
import { chapterAt, chapterIndexAt, copyAt, lerp, maskAt, smoothstep } from './story';

/** The picture's opening window, as percentages of the pinned stage. Read from CSS, so it can differ per screen size. */
interface Capsule {
  l: number;
  t: number;
  r: number;
  b: number;
}

/**
 * Runs the hero: turns scroll position into one number (0 to 1) and applies it to the page and the 3D scene.
 *
 * The section is a tall "runway" with a pinned (position: sticky, pure CSS) screen inside it. GSAP's
 * ScrollTrigger reports how far through the runway you are; from that one number we open the capsule,
 * fade the opening copy and the captions, and hand the same number to the 3D scene, which places the camera
 * and every object. The scene is an optional extra: if it cannot run, the still poster stays and every
 * other part of the story works exactly the same.
 */
export async function startHeroStory(root: HTMLElement): Promise<() => void> {
  const { gsap, ScrollTrigger } = await loadMotion();
  const pick = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector);
  const runway = pick('[data-hero-runway]');
  const pin = pick('[data-hero-pin]');
  const stageEl = pick('[data-hero-stage]');
  const host = pick('[data-hero-canvas]');
  if (!runway || !pin || !stageEl || !host) return () => {};

  const copy = pick('[data-hero-copy]');
  const hint = pick('[data-hero-hint]');
  const railFill = pick('[data-hero-rail-fill]');
  const chapters = [...root.querySelectorAll<HTMLElement>('[data-hero-chapter]')];
  const ticks = [...root.querySelectorAll<HTMLElement>('[data-hero-tick]')];

  let size = { w: 1, h: 1 };
  let capsule: Capsule = { l: 0, t: 0, r: 0, b: 0 };
  let centre = { dx: 0, dy: 0 }; // where the capsule's middle sits relative to the screen's middle
  let progress = 0;
  let scene: HeroScene | null = null;
  let disposed = false;
  let lastClip = '';

  /** Reads the pinned screen's size and the capsule's shape (which changes at breakpoints). */
  const measure = () => {
    size = { w: pin.clientWidth, h: pin.clientHeight };
    const css = getComputedStyle(pin);
    const read = (name: string) => Number.parseFloat(css.getPropertyValue(name)) || 0;
    capsule = { l: read('--cap-l'), t: read('--cap-t'), r: read('--cap-r'), b: read('--cap-b') };
    centre = {
      dx: (((capsule.l + 100 - capsule.r) / 2 - 50) / 100) * size.w,
      dy: (((capsule.t + 100 - capsule.b) / 2 - 50) / 100) * size.h,
    };
    lastClip = '';
    scene?.resize(size.w, size.h);
  };

  /** Applies one scroll position to everything on the page. */
  const apply = (p: number) => {
    progress = p;
    const open = maskAt(p);

    // The capsule opens: its four insets shrink to zero and its ends flatten. The radius is in pixels so the
    // stadium shape is exact, and it lingers so a nearly full-screen picture still has rounded corners.
    const capW = (size.w * (100 - capsule.l - capsule.r)) / 100;
    const capH = (size.h * (100 - capsule.t - capsule.b)) / 100;
    const radius = Math.min(capW, capH) / 2 * (1 - open) ** 1.6;
    const clip = `inset(${lerp(capsule.t, 0, open).toFixed(3)}% ${lerp(capsule.r, 0, open).toFixed(3)}% ${lerp(capsule.b, 0, open).toFixed(3)}% ${lerp(capsule.l, 0, open).toFixed(3)}% round ${radius.toFixed(1)}px)`;
    if (clip !== lastClip) {
      stageEl.style.clipPath = clip;
      lastClip = clip;
    }

    // The opening copy leaves as the picture opens.
    if (copy) {
      const c = copyAt(p);
      copy.style.opacity = String(c);
      copy.style.transform = `translate3d(0, ${((1 - c) * -28).toFixed(1)}px, 0)`;
      copy.dataset.gone = c <= 0.001 ? 'true' : 'false';
    }
    if (hint) hint.style.opacity = String(1 - smoothstep(0, 0.035, p));

    // Captions fade in and out one after another, and the rail shows how far along you are.
    chapters.forEach((el, i) => {
      const w = chapterAt(p, i);
      el.style.opacity = w.toFixed(3);
      el.style.transform = `translate3d(0, ${((1 - w) * 22).toFixed(1)}px, 0)`;
      el.dataset.active = w > 0.5 ? 'true' : 'false';
    });
    const current = chapterIndexAt(p);
    ticks.forEach((el, i) => (el.dataset.active = i <= current ? 'true' : 'false'));
    if (railFill) railFill.style.transform = `scaleY(${p.toFixed(4)})`;

    scene?.setCentre(lerp(centre.dx, 0, open), lerp(centre.dy, 0, open));
    scene?.setProgress(p);
  };

  measure();
  const trigger = ScrollTrigger.create({
    trigger: runway,
    start: 'top top',
    // the pinned screen stays put for exactly the runway's height minus its own
    end: () => `+=${Math.max(1, runway.offsetHeight - pin.offsetHeight)}`,
    onUpdate: (self) => apply(self.progress),
    onRefresh: (self) => {
      measure();
      apply(self.progress);
    },
  });
  apply(trigger.progress);
  root.dataset.scene = 'ready';
  void document.fonts?.ready.then(() => !disposed && ScrollTrigger.refresh());

  // ---- pointer parallax: a small, smoothed tilt of the camera on desktop
  let onMove: ((event: PointerEvent) => void) | undefined;
  let visible = true;
  if (hasFinePointer()) {
    const tilt = { x: 0, y: 0 };
    const push = () => visible && scene?.setParallax(tilt.x, tilt.y);
    const toX = gsap.quickTo(tilt, 'x', { duration: 1.1, ease: 'power3.out', onUpdate: push });
    const toY = gsap.quickTo(tilt, 'y', { duration: 1.1, ease: 'power3.out', onUpdate: push });
    onMove = (event) => {
      toX((event.clientX / window.innerWidth) * 2 - 1);
      toY((event.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
  }

  // ---- the 3D scene, added last and only where it makes sense
  const tick = (_time: number, deltaMs: number) => scene?.frame(deltaMs);
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? true;
    scene?.setVisible(visible);
  });
  observer.observe(root);

  const boot = async () => {
    if (disposed || !canRunScene()) return;
    try {
      const { createHeroScene } = await import('./hero-scene');
      if (disposed) return;
      const next = createHeroScene(host, pin, { onLost: () => (root.dataset.scene = 'ready') });
      scene = next;
      measure();
      apply(progress);
      await next.ready;
      if (disposed) return;
      root.dataset.scene = 'live'; // fades the canvas in over the poster
      gsap.ticker.add(tick);
      afterLoadAndIdle(() => void next.loadRest().catch(() => undefined), 4000); // the bag and cart, once things are quiet
    } catch {
      // No WebGL, or something failed to load: the poster and the rest of the story carry on.
      scene?.dispose();
      scene = null;
      root.dataset.scene = 'ready';
    }
  };
  const cancelBoot = afterLoadAndIdle(() => void boot(), 2500);

  return () => {
    disposed = true;
    cancelBoot();
    observer.disconnect();
    if (onMove) window.removeEventListener('pointermove', onMove);
    gsap.ticker.remove(tick);
    trigger.kill();
    scene?.dispose();
    scene = null;
    for (const el of [stageEl, copy, hint, railFill, ...chapters, ...ticks]) el?.removeAttribute('style');
    root.dataset.scene = 'idle';
  };
}
