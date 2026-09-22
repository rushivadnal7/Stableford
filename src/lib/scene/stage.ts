import { MathUtils, NeutralToneMapping, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import type { Shot } from './story';

/** The narrowest, tallest screens back the camera off so a wide shot still shows the whole island. */
const REFERENCE_ASPECT = 1.5;
export const aspectFit = (aspect: number, fit: number) =>
  aspect >= REFERENCE_ASPECT ? 1 : (REFERENCE_ASPECT / aspect) ** (0.12 + 0.5 * fit);

export interface Stage {
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
  readonly renderer: WebGLRenderer;
  /** Sets the drawing size in CSS pixels. */
  resize(width: number, height: number): void;
  /** Slides the picture so the middle of the world lands `dx`, `dy` pixels from the middle of the canvas. */
  setCentre(dx: number, dy: number): void;
  /** Places the camera on a shot, plus a small extra orbit (used for the pointer parallax). */
  pose(shot: Shot, extra?: { azimuth?: number; elevation?: number }): void;
  /** Says that the picture is out of date. Nothing is drawn until this is called. */
  invalidate(): void;
  /** Draws a frame if the picture changed and the stage is on screen. Returns whether it drew. */
  frame(deltaMs: number): boolean;
  setVisible(visible: boolean): void;
  dispose(): void;
}

/**
 * The renderer, the camera and the rules for when to draw.
 *
 * It draws only when something changed (scroll, pointer, an animation), and never while off screen, so a
 * page at rest costs the GPU nothing. If frames run slow it lowers its own resolution a step at a time.
 */
export function createStage(canvas: HTMLCanvasElement, { maxPixelRatio, onLost }: { maxPixelRatio: number; onLost: () => void }): Stage {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, maxPixelRatio);
  const renderer = new WebGLRenderer({
    canvas,
    // Multisampling costs a lot on a dense screen where the extra pixels already smooth the edges.
    antialias: pixelRatio < 2,
    alpha: true,
    powerPreference: 'high-performance',
    stencil: false,
  });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = NeutralToneMapping; // keeps the colours of the textures instead of crushing them
  renderer.setPixelRatio(pixelRatio);

  const scene = new Scene();
  const camera = new PerspectiveCamera(32, 1, 0.1, 400);
  let width = 1;
  let height = 1;
  let ratio = pixelRatio;
  let centre = { dx: 0, dy: 0 };
  let dirty = true;
  let visible = true;
  let lost = false;
  let slowFrames = 0;

  const applyCentre = () => {
    if (centre.dx === 0 && centre.dy === 0) camera.clearViewOffset();
    else camera.setViewOffset(width, height, -centre.dx, -centre.dy, width, height);
  };

  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    lost = true;
    onLost();
  });
  canvas.addEventListener('webglcontextrestored', () => {
    lost = false;
    dirty = true;
  });

  return {
    scene,
    camera,
    renderer,
    resize(w, h) {
      width = Math.max(1, Math.round(w));
      height = Math.max(1, Math.round(h));
      renderer.setPixelRatio(ratio);
      renderer.setSize(width, height, false); // CSS sizes the canvas; this sets its pixel grid
      camera.aspect = width / height;
      applyCentre();
      camera.updateProjectionMatrix();
      dirty = true;
    },
    setCentre(dx, dy) {
      centre = { dx, dy };
      applyCentre();
      camera.updateProjectionMatrix();
      dirty = true;
    },
    pose(shot, extra = {}) {
      const az = MathUtils.degToRad(shot.azimuth + (extra.azimuth ?? 0));
      const el = MathUtils.degToRad(shot.elevation + (extra.elevation ?? 0));
      const distance = shot.distance * aspectFit(camera.aspect, shot.fit);
      const [tx, ty, tz] = shot.target;
      camera.position.set(tx + Math.sin(az) * Math.cos(el) * distance, ty + Math.sin(el) * distance, tz + Math.cos(az) * Math.cos(el) * distance);
      camera.lookAt(tx, ty, tz);
      if (camera.fov !== shot.fov) {
        camera.fov = shot.fov;
        camera.updateProjectionMatrix();
      }
      dirty = true;
    },
    invalidate() {
      dirty = true;
    },
    frame(deltaMs) {
      if (!dirty || !visible || lost) return false;
      dirty = false;
      renderer.render(scene, camera);

      // Frame governor: while the picture is changing, a long run of slow frames means this device is
      // struggling, so draw fewer pixels. It only ever steps down, and never below one pixel per pixel.
      slowFrames = deltaMs > 28 ? slowFrames + 1 : Math.max(0, slowFrames - 2);
      if (slowFrames > 20 && ratio > 1) {
        ratio = Math.max(1, ratio - 0.25);
        slowFrames = 0;
        renderer.setPixelRatio(ratio);
        renderer.setSize(width, height, false);
      }
      return true;
    },
    setVisible(next) {
      visible = next;
      if (next) dirty = true;
    },
    dispose() {
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
