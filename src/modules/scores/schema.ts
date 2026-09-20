import { z } from 'zod';
import { CONFIG } from '@/lib/config';

const value = z.number().int().min(CONFIG.score.min).max(CONFIG.score.max);
const playedOn = z.iso.date();

export const createScoreSchema = z.object({ score: value, played_on: playedOn });

export const updateScoreSchema = z
  .object({ score: value.optional(), played_on: playedOn.optional() })
  .refine((v) => v.score !== undefined || v.played_on !== undefined, { message: 'Provide a score or a date to change.' });

export type CreateScoreInput = z.output<typeof createScoreSchema>;
export type UpdateScoreInput = z.output<typeof updateScoreSchema>;
