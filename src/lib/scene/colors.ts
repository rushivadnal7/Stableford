import { Color, SRGBColorSpace } from 'three';

let canvas: HTMLCanvasElement | undefined;

/**
 * The colour of a theme role (`--bg`, `--accent`, ...) as a three.js Color. The scene takes its colours from
 * the same CSS variables as the page, so the 3D world always matches the theme and there is no second palette.
 *
 * The browser does the resolving: a hidden element with `color: var(--role)` gets the computed colour (which
 * may be a `color-mix()` result), and a 1px canvas turns whatever syntax that comes back in into plain sRGB.
 */
export function themeColor(scope: Element, role: string): Color {
  const probe = document.createElement('span');
  probe.style.color = `var(${role})`;
  probe.style.display = 'none';
  scope.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();

  canvas ??= Object.assign(document.createElement('canvas'), { width: 1, height: 1 });
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return new Color(0.5, 0.5, 0.5);
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = resolved;
  ctx.fillRect(0, 0, 1, 1);
  const [r = 128, g = 128, b = 128] = ctx.getImageData(0, 0, 1, 1).data;
  return new Color().setRGB(r / 255, g / 255, b / 255, SRGBColorSpace);
}

/** The handful of roles the scene uses. */
export interface SceneColors {
  sky: Color;
  ground: Color;
  sun: Color;
  ball: Color;
  flag: Color;
  shadow: Color;
}

export function readSceneColors(scope: Element): SceneColors {
  return {
    sky: themeColor(scope, '--bg'),
    ground: themeColor(scope, '--accent'),
    sun: themeColor(scope, '--warm'),
    ball: themeColor(scope, '--bg'),
    flag: themeColor(scope, '--accent'),
    shadow: themeColor(scope, '--fg'),
  };
}
