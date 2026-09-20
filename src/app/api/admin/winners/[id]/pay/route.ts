import { adminContext } from '@/lib/auth';
import { api } from '@/lib/http';
import { markPaid } from '@/modules/winners/service';

/** Admin: mark an approved win as paid (Pending -> Paid). */
export const POST = api(async (req, { params }: { params: { id: string } }) => {
  const { admin, actorId } = await adminContext(req);
  return { winner: await markPaid(admin, actorId, params.id) };
});
