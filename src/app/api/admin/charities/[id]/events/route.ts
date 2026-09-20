import { adminContext } from '@/lib/auth';
import { api, readBody } from '@/lib/http';
import { createEventSchema } from '@/modules/charities/schema';
import { createEvent } from '@/modules/charities/service';

/** Admin: add an upcoming event (e.g. a golf day) to a charity. */
export const POST = api(async (req, { params }: { params: { id: string } }) => {
  const { admin, actorId } = await adminContext(req);
  const event = await createEvent(admin, actorId, params.id, await readBody(req, createEventSchema));
  return Response.json({ event }, { status: 201 });
});
