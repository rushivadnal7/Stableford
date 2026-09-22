import { adminContext } from '@/lib/auth';
import { api, readBody } from '@/lib/http';
import { audit } from '@/modules/audit/service';
import { updateScoreSchema } from '@/modules/scores/schema';
import { deleteScore, listScores, updateScore } from '@/modules/scores/service';

type Params = { id: string };

/** Admin: edit any member's score (PRD section 11). */
export const PATCH = api(async (req, { params }: { params: Params }) => {
  const { admin, actorId } = await adminContext(req);
  const patch = await readBody(req, updateScoreSchema);
  const score = await updateScore(admin, params.id, patch);
  await audit(admin, actorId, 'score.update', 'user', score.user_id, { scoreId: params.id, ...patch });
  return { score, scores: await listScores(admin, score.user_id) };
});

export const DELETE = api(async (req, { params }: { params: Params }) => {
  const { admin, actorId } = await adminContext(req);
  const { data } = await admin.from('scores').select('user_id').eq('id', params.id).maybeSingle();
  await deleteScore(admin, params.id);
  await audit(admin, actorId, 'score.delete', 'user', data?.user_id ?? null, { scoreId: params.id });
  // Mirrors the member's own DELETE /api/scores/[id]: hand back the refreshed list, so the admin UI
  // (the same ScoresPanel component the member dashboard uses) never needs a second round trip.
  return { scores: data ? await listScores(admin, data.user_id) : [] };
});
