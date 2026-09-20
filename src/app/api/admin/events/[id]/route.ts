import { adminContext } from '@/lib/auth';
import { api, readBody } from '@/lib/http';
import { updateEventSchema } from '@/modules/charities/schema';
import { deleteEvent, updateEvent } from '@/modules/charities/service';

type Params = { id: string };

export const PATCH = api(async (req, { params }: { params: Params }) => {
  const { admin, actorId } = await adminContext(req);
  return { event: await updateEvent(admin, actorId, params.id, await readBody(req, updateEventSchema)) };
});

export const DELETE = api(async (req, { params }: { params: Params }) => {
  const { admin, actorId } = await adminContext(req);
  await deleteEvent(admin, actorId, params.id);
  return { ok: true };
});
