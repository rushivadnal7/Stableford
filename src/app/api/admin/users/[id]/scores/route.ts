import { adminContext } from '@/lib/auth';
import { api, readBody } from '@/lib/http';
import { audit } from '@/modules/audit/service';
import { createScoreSchema } from '@/modules/scores/schema';
import { addScore, listScores } from '@/modules/scores/service';

type Params = { id: string };

export const GET = api(async (req, { params }: { params: Params }) => {
  const { admin } = await adminContext(req);
  return { scores: await listScores(admin, params.id) };
});

/** Admin: add a score on a member's behalf. The same database rules apply (five-score window, no future dates). */
export const POST = api(async (req, { params }: { params: Params }) => {
  const { admin, actorId } = await adminContext(req);
  const score = await addScore(admin, params.id, await readBody(req, createScoreSchema));
  await audit(admin, actorId, 'score.add', 'user', params.id, { score: score.score, played_on: score.played_on });
  return Response.json({ score, scores: await listScores(admin, params.id) }, { status: 201 });
});
