import { adminContext } from '@/lib/auth';
import { api, readBody } from '@/lib/http';
import { reviewSchema, reviewWinner } from '@/modules/winners/service';

/** Admin: approve or reject a submitted proof. A rejection needs a reason, and the winner can resubmit. */
export const POST = api(async (req, { params }: { params: { id: string } }) => {
  const { admin, actorId } = await adminContext(req);
  return { winner: await reviewWinner(admin, actorId, params.id, await readBody(req, reviewSchema)) };
});
