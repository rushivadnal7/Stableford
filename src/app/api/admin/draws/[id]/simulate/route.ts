import { adminContext } from '@/lib/auth';
import { api } from '@/lib/http';
import { simulateDraw } from '@/modules/draws/service';

/** Admin: dry-run the draw. Nothing is official until it is published; run it as often as needed. */
export const POST = api(async (req, { params }: { params: { id: string } }) => {
  const { admin, actorId } = await adminContext(req);
  return simulateDraw(admin, actorId, params.id);
});
