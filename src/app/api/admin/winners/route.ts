import { adminContext } from '@/lib/auth';
import { api, readQuery } from '@/lib/http';
import { listWinners, winnersListQuery } from '@/modules/winners/service';

/** Admin: the winners list (?verification=, ?payout=, ?draw_id=), with short-lived links to each proof. */
export const GET = api(async (req) => {
  const { admin } = await adminContext(req);
  return listWinners(admin, readQuery(req, winnersListQuery));
});
