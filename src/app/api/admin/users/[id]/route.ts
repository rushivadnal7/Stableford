import { adminContext } from '@/lib/auth';
import { api, readBody } from '@/lib/http';
import { adminUpdateUserSchema, getUser, updateUser } from '@/modules/admin/service';

type Params = { id: string };

/** Admin: one member in full (profile, subscription, scores, winnings, donations). */
export const GET = api(async (req, { params }: { params: Params }) => {
  const { admin } = await adminContext(req);
  return getUser(admin, params.id);
});

/** Admin: edit name, role, charity and contribution percentage. */
export const PATCH = api(async (req, { params }: { params: Params }) => {
  const { admin, actorId } = await adminContext(req);
  return { profile: await updateUser(admin, actorId, params.id, await readBody(req, adminUpdateUserSchema)) };
});
