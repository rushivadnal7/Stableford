import { adminContext } from '@/lib/auth';
import { api, readBody } from '@/lib/http';
import { createDrawSchema } from '@/modules/draws/schema';
import { createDraw, listDraws } from '@/modules/draws/service';

export const GET = api(async (req) => {
  const { admin } = await adminContext(req);
  return { draws: await listDraws(admin) };
});

/** Admin: open a draft draw for a month, choosing random or algorithmic (frequency-weighted) mode. */
export const POST = api(async (req) => {
  const { admin, actorId } = await adminContext(req);
  const draw = await createDraw(admin, actorId, await readBody(req, createDrawSchema));
  return Response.json({ draw }, { status: 201 });
});
