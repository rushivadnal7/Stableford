import { authenticate } from '@/lib/auth';
import { api } from '@/lib/http';
import { getMemberDraw } from '@/modules/draws/member';

/** A published draw: numbers, prize tiers, and how the signed-in member fared. */
export const GET = api(async (req, { params }: { params: { id: string } }) => {
  const ctx = await authenticate(req);
  return getMemberDraw(ctx.db, ctx.userId, params.id);
});
