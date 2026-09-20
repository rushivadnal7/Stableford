import { adminContext } from '@/lib/auth';
import { api } from '@/lib/http';
import { publishDraw } from '@/modules/draws/service';

/** Admin: make the simulated draw official and create the winners. Publishes exactly what was simulated. */
export const POST = api(async (req, { params }: { params: { id: string } }) => {
  const { admin, actorId } = await adminContext(req);
  return publishDraw(admin, actorId, params.id);
});
