import { adminContext } from '@/lib/auth';
import { api, readQuery } from '@/lib/http';
import { auditQuery, listAudit } from '@/modules/admin/service';

/** Admin: the most recent admin actions. */
export const GET = api(async (req) => {
  const { admin } = await adminContext(req);
  return { entries: await listAudit(admin, readQuery(req, auditQuery).limit) };
});
