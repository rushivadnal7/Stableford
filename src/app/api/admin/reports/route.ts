import { adminContext } from '@/lib/auth';
import { api } from '@/lib/http';
import { getReport } from '@/modules/admin/service';

/** Admin: total users, prize pool, charity contribution totals and draw statistics. */
export const GET = api(async (req) => {
  const { admin } = await adminContext(req);
  return getReport(admin);
});
