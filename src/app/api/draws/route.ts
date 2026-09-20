import { authenticate } from '@/lib/auth';
import { api } from '@/lib/http';
import { listPublishedDraws } from '@/modules/draws/member';

/** Published draws, newest first. */
export const GET = api(async (req) => {
  const ctx = await authenticate(req);
  return { draws: await listPublishedDraws(ctx.db) };
});
