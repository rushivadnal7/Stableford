import { authenticate, requireSubscriber } from '@/lib/auth';
import { api, readBody } from '@/lib/http';
import { createScoreSchema } from '@/modules/scores/schema';
import { addScore, listScores } from '@/modules/scores/service';

/** Any signed-in member can read their history, newest first, even after a subscription lapses. */
export const GET = api(async (req) => {
  const ctx = await authenticate(req);
  return { scores: await listScores(ctx.db, ctx.userId) };
});

/** Adding needs an active subscription. The oldest score drops off once there are more than five. */
export const POST = api(async (req) => {
  const ctx = await requireSubscriber(req);
  const input = await readBody(req, createScoreSchema);
  const score = await addScore(ctx.db, ctx.userId, input);
  return Response.json({ score, scores: await listScores(ctx.db, ctx.userId) }, { status: 201 });
});
