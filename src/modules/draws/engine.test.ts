import { describe, expect, it } from 'vitest';
import { createRng, drawNumbers, newSeed, numberWeights } from './engine';

describe('createRng', () => {
  it('is deterministic for a seed and stays within [0, 1)', () => {
    const a = createRng('seed-1');
    const b = createRng('seed-1');
    for (let i = 0; i < 100; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it('gives different sequences for different seeds', () => {
    expect(createRng('seed-1')()).not.toBe(createRng('seed-2')());
  });
});

describe('numberWeights', () => {
  it('weighs every number equally in random mode', () => {
    const w = numberWeights('random', null, { '30': 50 });
    expect(w).toHaveLength(45);
    expect(new Set(w)).toEqual(new Set([1]));
  });

  it('favours frequent numbers with "common" and rare ones with "rare"', () => {
    const freq = { '30': 10, '31': 4 };
    const common = numberWeights('algorithmic', 'common', freq);
    expect(common[29]).toBe(11); // number 30
    expect(common[30]).toBe(5); // number 31
    expect(common[0]).toBe(1); // number 1: nobody holds it, still possible

    const rare = numberWeights('algorithmic', 'rare', freq);
    expect(rare[29]).toBe(1); // most frequent -> lowest weight
    expect(rare[30]).toBe(7);
    expect(rare[0]).toBe(11); // never held -> highest weight
  });
});

describe('drawNumbers', () => {
  const base = { mode: 'random' as const, frequencies: {} };

  it('is reproducible: the same seed and inputs give the same numbers', () => {
    expect(drawNumbers({ ...base, seed: 'abc' })).toEqual(drawNumbers({ ...base, seed: 'abc' }));
  });

  it('returns 5 distinct, sorted numbers between 1 and 45', () => {
    for (let i = 0; i < 500; i++) {
      const nums = drawNumbers({ ...base, seed: `s-${i}` });
      expect(nums).toHaveLength(5);
      expect(new Set(nums).size).toBe(5);
      expect([...nums].sort((a, b) => a - b)).toEqual(nums);
      expect(Math.min(...nums)).toBeGreaterThanOrEqual(1);
      expect(Math.max(...nums)).toBeLessThanOrEqual(45);
    }
  });

  it('is roughly uniform in random mode', () => {
    const counts = new Array(46).fill(0);
    const draws = 4000;
    for (let i = 0; i < draws; i++) for (const n of drawNumbers({ ...base, seed: `u-${i}` })) counts[n]++;
    const expected = (draws * 5) / 45; // about 444
    for (let n = 1; n <= 45; n++) {
      expect(counts[n]).toBeGreaterThan(expected * 0.7);
      expect(counts[n]).toBeLessThan(expected * 1.3);
    }
  });

  it('"common" weighting makes the hottest number come up far more often than "rare" does', () => {
    const frequencies = { '30': 100 };
    let common = 0;
    let rare = 0;
    for (let i = 0; i < 500; i++) {
      if (drawNumbers({ mode: 'algorithmic', weighting: 'common', frequencies, seed: `w-${i}` }).includes(30)) common++;
      if (drawNumbers({ mode: 'algorithmic', weighting: 'rare', frequencies, seed: `w-${i}` }).includes(30)) rare++;
    }
    expect(common).toBeGreaterThan(300); // about 85% of draws
    expect(rare).toBeLessThan(10); // well under 1%
  });

  it('requires a weighting for algorithmic draws', () => {
    expect(() => drawNumbers({ mode: 'algorithmic', frequencies: {}, seed: 'x' })).toThrow(/weighting/);
  });
});

describe('newSeed', () => {
  it('produces unique hex seeds', () => {
    const a = newSeed();
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(newSeed()).not.toBe(a);
  });
});
