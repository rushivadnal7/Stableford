import { adminContext } from '@/lib/auth';
import { api, readQuery } from '@/lib/http';
import { listUsers, userListQuery } from '@/modules/admin/service';

/** Admin: search and page through members (?q=, ?limit=, ?offset=). */
export const GET = api(async (req) => {
  const { admin } = await adminContext(req);
  return listUsers(admin, readQuery(req, userListQuery));
});
