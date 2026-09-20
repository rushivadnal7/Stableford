import { adminContext } from '@/lib/auth';
import { api, readBody } from '@/lib/http';
import { updateDrawSchema } from '@/modules/draws/schema';
import { getDrawDetail, updateDraw } from '@/modules/draws/service';

type Params = { id: string };

/** Admin: a draw with its prize ledger and winners (a preview until published). */
export const GET = api(async (req, { params }: { params: Params }) => {
  const { admin } = await adminContext(req);
  return getDrawDetail(admin, params.id);
});

/** Admin: change the mode of a draft. This clears any earlier simulation. */
export const PATCH = api(async (req, { params }: { params: Params }) => {
  const { admin, actorId } = await adminContext(req);
  return { draw: await updateDraw(admin, actorId, params.id, await readBody(req, updateDrawSchema)) };
});
