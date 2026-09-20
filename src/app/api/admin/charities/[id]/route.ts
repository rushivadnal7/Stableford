import { adminContext } from '@/lib/auth';
import { api, readBody } from '@/lib/http';
import { updateCharitySchema } from '@/modules/charities/schema';
import { deleteCharity, updateCharity } from '@/modules/charities/service';

type Params = { id: string };

export const PATCH = api(async (req, { params }: { params: Params }) => {
  const { admin, actorId } = await adminContext(req);
  return { charity: await updateCharity(admin, actorId, params.id, await readBody(req, updateCharitySchema)) };
});

/** Deletes an unused charity; one with history is hidden instead (see `deactivated` in the response). */
export const DELETE = api(async (req, { params }: { params: Params }) => {
  const { admin, actorId } = await adminContext(req);
  return deleteCharity(admin, actorId, params.id);
});
