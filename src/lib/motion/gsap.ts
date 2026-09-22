/**
 * GSAP and its ScrollTrigger plugin, loaded on demand. Nothing imports these at the top of a module, so
 * they stay out of the first-load JavaScript: pages become interactive first, and motion is added after.
 */
type Gsap = typeof import('gsap').gsap;
type ScrollTriggerPlugin = typeof import('gsap/ScrollTrigger').ScrollTrigger;

export interface Motion {
  gsap: Gsap;
  ScrollTrigger: ScrollTriggerPlugin;
}

let loading: Promise<Motion> | undefined;

export function loadMotion(): Promise<Motion> {
  loading ??= Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([core, plugin]) => {
    core.gsap.registerPlugin(plugin.ScrollTrigger);
    // A phone's address bar sliding away resizes the window; that must not re-measure the whole page.
    plugin.ScrollTrigger.config({ ignoreMobileResize: true });
    return { gsap: core.gsap, ScrollTrigger: plugin.ScrollTrigger };
  });
  return loading;
}
