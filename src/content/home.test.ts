import { describe, expect, it } from 'vitest';
import { CONFIG, TIERS } from '@/lib/config';
import { ANCHORS } from '@/lib/routes';
import { FAQ, FOOTER, HERO, matchesOf, NAV, PRIZES, SAMPLE, STEPS } from './home';

describe('home content', () => {
  it('takes the prize shares from the same config as the backend', () => {
    expect(PRIZES.tiers.map((t) => t.tier)).toEqual([...TIERS]);
    for (const t of PRIZES.tiers) expect(t.share).toBe(CONFIG.prize.tierSharePercent[t.tier]);
    expect(PRIZES.tiers.reduce((sum, t) => sum + t.share, 0)).toBe(100);
  });

  it('uses a sample entry that really matches three numbers, so the copy is honest', () => {
    expect(matchesOf(SAMPLE.scores, SAMPLE.drawn)).toEqual([12, 27, 31]);
    expect(SAMPLE.scores).toHaveLength(CONFIG.score.keep);
    expect(SAMPLE.drawn).toHaveLength(CONFIG.prize.numbersPerDraw);
    expect(SAMPLE.charityPercent).toBeGreaterThanOrEqual(CONFIG.charity.minPercent);
  });

  it('links navigation only to anchors that exist', () => {
    const anchors = new Set<string>(Object.values(ANCHORS));
    for (const link of [...NAV, ...FOOTER.groups.flatMap((g) => g.links)]) expect(anchors.has(link.href)).toBe(true);
  });

  it('has four steps, a full FAQ, and no empty copy', () => {
    expect(STEPS).toHaveLength(4);
    expect(FAQ.items.length).toBeGreaterThanOrEqual(5);
    for (const item of FAQ.items) {
      expect(item.q.length).toBeGreaterThan(5);
      expect(item.a.length).toBeGreaterThan(20);
    }
    expect(HERO.assurances.length).toBeGreaterThan(0);
  });
});
