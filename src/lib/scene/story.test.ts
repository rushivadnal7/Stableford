import { describe, expect, it } from 'vitest';
import {
  alongPath,
  ballAt,
  bezier,
  CART_ROUTE,
  CHAPTER_STOPS,
  chapterAt,
  chapterIndexAt,
  copyAt,
  maskAt,
  PLACES,
  SHOTS,
  shotAt,
  smoothPath,
  STOPS,
} from './story';

describe('camera shots', () => {
  it('has one shot for every stop, starting at 0 and ending at 1 in ascending order', () => {
    expect(SHOTS).toHaveLength(STOPS.length);
    expect(STOPS[0]).toBe(0);
    expect(STOPS[STOPS.length - 1]).toBe(1);
    expect([...STOPS]).toEqual([...STOPS].sort((a, b) => a - b));
  });

  it('is exactly on each shot at its stop', () => {
    STOPS.forEach((stop, i) => {
      const shot = shotAt(stop);
      expect(shot.azimuth).toBeCloseTo(SHOTS[i]!.azimuth, 6);
      expect(shot.distance).toBeCloseTo(SHOTS[i]!.distance, 6);
      expect(shot.target[1]).toBeCloseTo(SHOTS[i]!.target[1], 6);
    });
  });

  it('settles on each shot: the camera is nearly still just either side of a stop', () => {
    for (const stop of STOPS.slice(1, -1)) {
      const before = shotAt(stop - 0.004).distance;
      const at = shotAt(stop).distance;
      const after = shotAt(stop + 0.004).distance;
      const midway = Math.abs(shotAt(stop - 0.13).distance - shotAt(stop - 0.12).distance);
      expect(Math.abs(at - before)).toBeLessThan(midway);
      expect(Math.abs(after - at)).toBeLessThan(midway);
    }
  });

  it('clamps progress outside 0 to 1', () => {
    expect(shotAt(-3)).toEqual(shotAt(0));
    expect(shotAt(9)).toEqual(shotAt(1));
  });

  it('never moves the camera through the ground', () => {
    for (let p = 0; p <= 1; p += 0.01) {
      const s = shotAt(p);
      const height = s.target[1] + Math.sin((s.elevation * Math.PI) / 180) * s.distance;
      expect(height, `at ${p.toFixed(2)}`).toBeGreaterThan(0.6);
    }
  });
});

describe('mask and copy', () => {
  it('starts as a capsule and ends full screen', () => {
    expect(maskAt(0)).toBe(0);
    expect(maskAt(1)).toBe(1);
  });

  it('shows the opening copy at the top and none of it once the story is under way', () => {
    expect(copyAt(0)).toBe(1);
    expect(copyAt(0.2)).toBe(0);
  });

  it('opens the picture only after the copy has begun to leave', () => {
    expect(copyAt(0.05)).toBeLessThan(1);
    expect(maskAt(0.05)).toBeLessThan(0.3);
  });
});

describe('captions', () => {
  it('has a caption for every shot after the opening one', () => {
    expect(CHAPTER_STOPS).toHaveLength(SHOTS.length - 1);
  });

  it('shows one caption at a time, fully, at its own stop', () => {
    CHAPTER_STOPS.forEach((stop, i) => {
      expect(chapterAt(stop, i)).toBe(1);
      CHAPTER_STOPS.forEach((_, j) => {
        if (j !== i) expect(chapterAt(stop, j), `caption ${j} at stop ${i}`).toBe(0);
      });
    });
  });

  it('shows no caption at the very top, and keeps the last one to the end', () => {
    CHAPTER_STOPS.forEach((_, i) => expect(chapterAt(0, i)).toBe(0));
    expect(chapterAt(1, CHAPTER_STOPS.length - 1)).toBe(1);
  });

  it('reports which caption is current', () => {
    expect(chapterIndexAt(0)).toBe(-1);
    expect(chapterIndexAt(CHAPTER_STOPS[0]!)).toBe(0);
    expect(chapterIndexAt(1)).toBe(CHAPTER_STOPS.length - 1);
  });
});

describe('the ball', () => {
  const a = [0, 0, 0] as const;
  const c = [5, 10, 0] as const;
  const b = [10, 0, 0] as const;

  it('starts at the tee and lands at the target', () => {
    expect(bezier(a, c, b, 0)).toEqual([0, 0, 0]);
    expect(bezier(a, c, b, 1)).toEqual([10, 0, 0]);
  });

  it('flies over the middle, higher than either end', () => {
    expect(bezier(a, c, b, 0.5)[1]).toBeGreaterThan(4);
  });

  it('is on the ground at the top of the page and has landed by the end', () => {
    expect(ballAt(0)).toBe(0);
    expect(ballAt(1)).toBe(1);
  });

  it('lands on the green: inside the island, near the flag', () => {
    const [x, z] = PLACES.ball.to;
    expect(Math.hypot(x - PLACES.flag.x, z - PLACES.flag.z)).toBeLessThan(2);
  });
});

describe('the cart route', () => {
  it('passes through every waypoint, and rounding adds points but not a detour', () => {
    expect(CART_ROUTE.length).toBeGreaterThan(PLACES.cartPath.length);
    expect(CART_ROUTE[0]).toEqual(PLACES.cartPath[0]);
    expect(CART_ROUTE[CART_ROUTE.length - 1]).toEqual(PLACES.cartPath[PLACES.cartPath.length - 1]);
  });

  it('starts and ends where the route does', () => {
    const start = alongPath(CART_ROUTE, 0);
    const end = alongPath(CART_ROUTE, 1);
    expect([start.x, start.z]).toEqual([...PLACES.cartPath[0]!]);
    expect(end.x).toBeCloseTo(PLACES.cartPath[PLACES.cartPath.length - 1]![0], 5);
  });

  it('turns gradually: the heading never jumps between nearby points', () => {
    let last = alongPath(CART_ROUTE, 0).heading;
    for (let t = 0.005; t <= 1; t += 0.005) {
      const heading = alongPath(CART_ROUTE, t).heading;
      expect(Math.abs(heading - last)).toBeLessThan(0.25);
      last = heading;
    }
  });

  it('moves steadily forward as t grows', () => {
    const p1 = alongPath(CART_ROUTE, 0.2);
    const p2 = alongPath(CART_ROUTE, 0.6);
    expect(Math.hypot(p2.x - p1.x, p2.z - p1.z)).toBeGreaterThan(3);
  });

  it('handles a straight two-point route', () => {
    const line = smoothPath([[0, 0], [10, 0]], 4);
    expect(alongPath(line, 0.5).x).toBeCloseTo(5, 5);
  });
});
