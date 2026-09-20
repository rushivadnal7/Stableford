import { z } from 'zod';
import { PERIOD_PATTERN } from './period';

const mode = z.enum(['random', 'algorithmic']);
const weighting = z.enum(['common', 'rare']);

/** An algorithmic draw needs a weighting; a random draw must not have one (mirrors a database CHECK). */
function weightingMatchesMode(v: { mode?: string; weighting?: string | null }, ctx: z.RefinementCtx) {
  if (v.mode === 'algorithmic' && !v.weighting) {
    ctx.addIssue({ code: 'custom', path: ['weighting'], message: 'Choose "common" or "rare" for an algorithmic draw.' });
  }
  if (v.mode === 'random' && v.weighting) {
    ctx.addIssue({ code: 'custom', path: ['weighting'], message: 'A random draw has no weighting.' });
  }
}

export const createDrawSchema = z
  .object({
    period: z.string().regex(PERIOD_PATTERN, 'Use the format YYYY-MM.'),
    mode: mode.default('random'),
    weighting: weighting.nullish(),
  })
  .superRefine(weightingMatchesMode);

export const updateDrawSchema = z.object({ mode, weighting: weighting.nullish() }).superRefine(weightingMatchesMode);

export type CreateDrawInput = z.output<typeof createDrawSchema>;
export type UpdateDrawInput = z.output<typeof updateDrawSchema>;
