import { requireSubscriber } from '@/lib/auth';
import { api, readBody } from '@/lib/http';
import { updateScoreSchema } from '@/modules/scores/schema';
import { deleteScore, listScores, updateScore } from '@/modules/scores/service';

type Params = { id: string };

export const PATCH = api(async (req, { params }: { params: Params }) => {
  const ctx = await requireSubscriber(req);
  const score = await updateScore(ctx.db, params.id, await readBody(req, updateScoreSchema));
  return { score, scores: await listScores(ctx.db, ctx.userId) };
});

export const DELETE = api(async (req, { params }: { params: Params }) => {
  const ctx = await requireSubscriber(req);
  await deleteScore(ctx.db, params.id);
  return { scores: await listScores(ctx.db, ctx.userId) };
});
