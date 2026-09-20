import { adminContext } from '@/lib/auth';
import { api, readBody } from '@/lib/http';
import { createCharitySchema } from '@/modules/charities/schema';
import { createCharity, listAllCharities } from '@/modules/charities/service';

/** Admin: every charity, including hidden ones. */
export const GET = api(async (req) => {
  const { admin } = await adminContext(req);
  return { charities: await listAllCharities(admin) };
});

export const POST = api(async (req) => {
  const { admin, actorId } = await adminContext(req);
  const charity = await createCharity(admin, actorId, await readBody(req, createCharitySchema));
  return Response.json({ charity }, { status: 201 });
});
