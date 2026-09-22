import { readSceneColors } from './colors';
import { createStage } from './stage';
import { shotAt } from './story';
import { createWorld } from './world';

export interface HeroScene {
  /** Resolves once the first frame is on the canvas, ready to fade in over the still picture. */
  ready: Promise<void>;
  /** Loads the bag and the cart, which the story needs later. Call when the browser is idle. */
  loadRest(): Promise<void>;
  setProgress(progress: number): void;
  resize(width: number, height: number): void;
  /** Where the middle of the world sits, in pixels from the middle of the canvas. */
  setCentre(dx: number, dy: number): void;
  /** A small tilt of the camera from the pointer, each axis from -1 to 1. */
  setParallax(x: number, y: number): void;
  setVisible(visible: boolean): void;
  /** Draws a frame if the picture changed. Call from the shared animation ticker. */
  frame(deltaMs: number): void;
  dispose(): void;
}

const PARALLAX_DEGREES = { azimuth: 2.4, elevation: 1.2 };

/** Puts a canvas in `host` and runs the 3D world in it. Throws if WebGL is unavailable. */
export function createHeroScene(host: HTMLElement, theme: Element, options: { onLost: () => void }): HeroScene {
  const canvas = document.createElement('canvas');
  canvas.className = 'hero-canvas';
  canvas.setAttribute('aria-hidden', 'true');

  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const stage = createStage(canvas, { maxPixelRatio: coarse ? 1.5 : 1.75, onLost: options.onLost });
  host.appendChild(canvas); // added only once the renderer exists, so a device without WebGL never gets a blank canvas

  const world = createWorld(stage.scene, readSceneColors(theme));
  let progress = 0;
  let parallax = { x: 0, y: 0 };

  const pose = () =>
    stage.pose(shotAt(progress), { azimuth: parallax.x * PARALLAX_DEGREES.azimuth, elevation: -parallax.y * PARALLAX_DEGREES.elevation });

  const ready = (async () => {
    await world.loadCore();
    world.update(progress);
    pose();
    await stage.renderer.compileAsync(stage.scene, stage.camera);
    stage.frame(0); // draw the first frame now, so the fade-in reveals a finished picture
  })();

  return {
    ready,
    async loadRest() {
      await world.loadRest(async () => void (await stage.renderer.compileAsync(stage.scene, stage.camera)));
      world.update(progress);
      stage.invalidate();
    },
    setProgress(next) {
      progress = next;
      world.update(next);
      pose();
    },
    resize: (w, h) => stage.resize(w, h),
    setCentre: (dx, dy) => stage.setCentre(dx, dy),
    setParallax(x, y) {
      parallax = { x, y };
      pose();
    },
    setVisible: (visible) => stage.setVisible(visible),
    frame: (deltaMs) => void stage.frame(deltaMs),
    dispose() {
      world.dispose();
      stage.dispose();
      canvas.remove();
    },
  };
}
