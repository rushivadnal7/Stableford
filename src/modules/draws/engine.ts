import { createHash, randomBytes } from 'node:crypto';
import { CONFIG } from '@/lib/config';

export type DrawMode = 'random' | 'algorithmic';
export type DrawWeighting = 'common' | 'rare';

/** How many entries hold each number, keyed by number, e.g. { "30": 12, "31": 4 }. From `create_draw_snapshot`. */
export type Frequencies = Record<string, number>;

export interface DrawInput {
  mode: DrawMode;
  weighting?: DrawWeighting | null;
  frequencies: Frequencies;
  seed: string;
}

/** A fresh seed. It is stored with the draw, so any published draw can be replayed and audited. */
export const newSeed = () => randomBytes(16).toString('hex');

/**
 * Deterministic random numbers in [0, 1) from a string seed (sfc32, seeded through SHA-256).
 * The same seed always gives the same sequence, which is what makes a draw reproducible.
 */
export function createRng(seed: string): () => number {
  const h = createHash('sha256').update(seed).digest();
  let a = h.readUInt32LE(0);
  let b = h.readUInt32LE(4);
  let c = h.readUInt32LE(8);
  let d = h.readUInt32LE(12);
  return () => {
    a |= 0; b |= 0; c |= 0; d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

/**
 * Weight of each number 1..45 (index 0 is number 1).
 *  - random:               every number weighs 1.
 *  - algorithmic, common:  weight = frequency + 1, so numbers people actually score come up more often
 *                          and more entries match (more winners, fewer rollovers).
 *  - algorithmic, rare:    weight = (max frequency - frequency) + 1, the opposite (fewer winners, bigger jackpots).
 * The +1 keeps every number possible, including ones nobody holds.
 */
export function numberWeights(mode: DrawMode, weighting: DrawWeighting | null | undefined, frequencies: Frequencies): number[] {
  const { numberMin, numberMax } = CONFIG.prize;
  const numbers = Array.from({ length: numberMax - numberMin + 1 }, (_, i) => numberMin + i);
  if (mode === 'random') return numbers.map(() => 1);

  const freq = numbers.map((n) => frequencies[String(n)] ?? 0);
  const max = Math.max(0, ...freq);
  return freq.map((f) => (weighting === 'rare' ? max - f + 1 : f + 1));
}

/** Draw 5 distinct numbers, sampling without replacement in proportion to weight. Returned sorted. */
export function drawNumbers({ mode, weighting, frequencies, seed }: DrawInput): number[] {
  if (mode === 'algorithmic' && !weighting) throw new Error('An algorithmic draw needs a weighting.');

  const rng = createRng(seed);
  const weights = numberWeights(mode, weighting, frequencies);
  const pool = weights.map((weight, i) => ({ n: CONFIG.prize.numberMin + i, weight }));
  const picked: number[] = [];

  for (let i = 0; i < CONFIG.prize.numbersPerDraw; i++) {
    const total = pool.reduce((sum, p) => sum + p.weight, 0);
    let target = rng() * total;
    let index = pool.findIndex((p) => (target -= p.weight) < 0);
    if (index === -1) index = pool.length - 1; // floating point guard
    picked.push(pool[index]!.n);
    pool.splice(index, 1);
  }
  return picked.sort((x, y) => x - y);
}
