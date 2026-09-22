/**
 * The choreography of the hero story as pure data and maths: no three.js, no DOM.
 * Everything that moves as you scroll is a function of one number, `progress`, from 0 (top of the story)
 * to 1 (end of the scroll runway). That keeps the scene deterministic (same scroll, same picture),
 * easy to tune in one place, and easy to test.
 *
 * Coordinates are scene units: about a metre in a slightly oversized diorama (the statue is 3.2 tall,
 * the green about 20 wide). +X is right, +Y is up, +Z is toward the viewer.
 */

export type Vec3 = readonly [x: number, y: number, z: number];

/** A camera position described as an orbit around a point, which keeps every move a smooth arc. */
export interface Shot {
  /** The point the camera looks at. */
  target: Vec3;
  /** Degrees around the target. 0 looks from the front (+Z), 90 from the right (+X), negative from the left. */
  azimuth: number;
  /** Degrees above the horizon. */
  elevation: number;
  distance: number;
  /** Vertical field of view in degrees. */
  fov: number;
  /**
   * How much the camera backs off on a narrow (portrait) screen, 0 to 1. A close-up of one figure needs
   * none; a wide shot of the whole island needs a lot, or the sides are cut off.
   */
  fit: number;
}

/** Where things stand on the island. `x` and `z` are placed by hand; the height comes from the ground itself. */
export const PLACES = {
  statue: { x: -6.6, z: -0.6, yaw: 64 },
  bag: { x: -3.9, z: 1.7, yaw: -28 },
  flag: { x: 4.5, z: -1.0 },
  /** The ball is struck from just in front of the statue's feet, and lands on the green near the flag. */
  ball: { from: [-5.35, 0.1] as const, to: [3.7, -0.5] as const, apex: 6.4, radius: 0.13 },
  /** The cart drives in from the far left and stops beside the bunker. Points are x, z. */
  cartPath: [
    [-13.4, -1.6],
    [-9.6, 2.8],
    [-4.6, 4.6],
    [0.4, 4.2],
    [3.9, 2.4],
  ] as ReadonlyArray<readonly [number, number]>,
} as const;

/**
 * Progress at which each shot is reached. Between two stops the camera glides with easing that starts
 * and ends at rest, so it settles on every shot before moving on.
 */
export const STOPS = [0, 0.27, 0.52, 0.77, 1] as const;

export const SHOTS: readonly Shot[] = [
  // 0. The opening frame: the statue alone in a tall window
  { target: [-6.2, 1.9, 0], azimuth: -16, elevation: 9, distance: 15.5, fov: 32, fit: 0.05 },
  // 1. Close on the statue, low, like a trophy shot; the ball is just leaving
  { target: [-6.1, 1.85, 0], azimuth: -30, elevation: 4, distance: 8.6, fov: 30, fit: 0.05 },
  // 2. The bag and its clubs
  { target: [-3.9, 1.15, 1.7], azimuth: 26, elevation: 12, distance: 6.4, fov: 30, fit: 0.1 },
  // 3. Wide, as the cart drives across the green
  { target: [-1.6, 1.2, 1.6], azimuth: 44, elevation: 15, distance: 17, fov: 32, fit: 0.85 },
  // 4. The whole island from above
  { target: [-1.2, 0.2, 0.4], azimuth: -8, elevation: 52, distance: 31, fov: 32, fit: 1 },
];

/** One caption per shot after the opening one. `at` is the stop it belongs to. */
export const CHAPTER_STOPS = STOPS.slice(1);

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
/** Zero speed and zero acceleration at both ends: motion that settles instead of just stopping. */
export const smootherstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * t * (t * (t * 6 - 15) + 10);
};

/** The camera at a given progress. */
export function shotAt(progress: number): Shot {
  const p = clamp01(progress);
  let i = STOPS.length - 2;
  for (let k = 0; k < STOPS.length - 1; k++) {
    if (p <= STOPS[k + 1]!) {
      i = k;
      break;
    }
  }
  const from = SHOTS[i]!;
  const to = SHOTS[i + 1]!;
  const t = smootherstep(STOPS[i]!, STOPS[i + 1]!, p);
  return {
    target: [lerp(from.target[0], to.target[0], t), lerp(from.target[1], to.target[1], t), lerp(from.target[2], to.target[2], t)],
    azimuth: lerp(from.azimuth, to.azimuth, t),
    elevation: lerp(from.elevation, to.elevation, t),
    distance: lerp(from.distance, to.distance, t),
    fov: lerp(from.fov, to.fov, t),
    fit: lerp(from.fit, to.fit, t),
  };
}

/** 0 while the picture is a capsule, 1 once it fills the screen. */
export const maskAt = (progress: number) => smootherstep(0.02, 0.24, progress);

/** 1 while the opening copy is fully visible, 0 once it has gone. */
export const copyAt = (progress: number) => 1 - smoothstep(0.015, 0.11, progress);

/** How visible caption `index` (0-based) is at this progress: fades in before its stop and out after it. */
export function chapterAt(progress: number, index: number): number {
  const at = CHAPTER_STOPS[index]!;
  const last = index === CHAPTER_STOPS.length - 1;
  const rise = smoothstep(at - 0.1, at - 0.035, progress);
  const fall = last ? 1 : 1 - smoothstep(at + 0.04, at + 0.105, progress);
  return Math.min(rise, fall);
}

/** Which caption is the current one, for the progress rail. */
export const chapterIndexAt = (progress: number) => {
  let index = -1;
  CHAPTER_STOPS.forEach((at, i) => {
    if (progress >= at - 0.09) index = i;
  });
  return index;
};

/** The ball's flight: 0 on the ground at the tee, 1 landed near the flag. It leaves as the mask opens. */
export const ballAt = (progress: number) => smootherstep(0.06, 0.6, progress);

/** The cart's drive along its path: 0 at the far left, 1 parked. It is only on the island for the third shot. */
export const cartAt = (progress: number) => smootherstep(0.5, 0.9, progress);

/** The bag arrives as the camera turns toward it: 0 hidden, 1 standing. */
export const bagAt = (progress: number) => smoothstep(0.3, 0.44, progress);

/** A gentle turn of the statue as the camera circles it. */
export const statueTurnAt = (progress: number) => lerp(0, 14, smootherstep(0.02, 0.6, progress));

/** Warms the light toward evening across the story. */
export const warmthAt = (progress: number) => smoothstep(0.1, 1, progress);

/** A point on a quadratic curve, used for the ball's arc. */
export function bezier(a: Vec3, control: Vec3, b: Vec3, t: number): Vec3 {
  const u = 1 - t;
  return [
    u * u * a[0] + 2 * u * t * control[0] + t * t * b[0],
    u * u * a[1] + 2 * u * t * control[1] + t * t * b[1],
    u * u * a[2] + 2 * u * t * control[2] + t * t * b[2],
  ];
}

/** Rounds the corners of a route: a Catmull-Rom curve through the points, sampled into a fine polyline. */
export function smoothPath(points: ReadonlyArray<readonly [number, number]>, samplesPerSegment = 14): Array<readonly [number, number]> {
  const out: Array<readonly [number, number]> = [];
  const at = (i: number) => points[Math.min(points.length - 1, Math.max(0, i))]!;
  for (let i = 0; i < points.length - 1; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    for (let s = 0; s < samplesPerSegment; s++) {
      const t = s / samplesPerSegment;
      const t2 = t * t;
      const t3 = t2 * t;
      const axis = (k: 0 | 1) =>
        0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
      out.push([axis(0), axis(1)]);
    }
  }
  out.push(points[points.length - 1]!);
  return out;
}

/** The cart's route with its corners rounded. */
export const CART_ROUTE = smoothPath(PLACES.cartPath);

/** Position and heading of something driving along a polyline of (x, z) points at distance fraction `t`. */
export function alongPath(points: ReadonlyArray<readonly [number, number]>, t: number): { x: number; z: number; heading: number } {
  const lengths: number[] = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, az] = points[i]!;
    const [bx, bz] = points[i + 1]!;
    const len = Math.hypot(bx - ax, bz - az);
    lengths.push(len);
    total += len;
  }
  let remaining = clamp01(t) * total;
  for (let i = 0; i < lengths.length; i++) {
    const len = lengths[i]!;
    if (remaining <= len || i === lengths.length - 1) {
      const [ax, az] = points[i]!;
      const [bx, bz] = points[i + 1]!;
      const f = len === 0 ? 0 : Math.min(1, remaining / len);
      return { x: lerp(ax, bx, f), z: lerp(az, bz, f), heading: Math.atan2(bx - ax, bz - az) };
    }
    remaining -= len;
  }
  const [x, z] = points[points.length - 1]!;
  return { x, z, heading: 0 };
}
