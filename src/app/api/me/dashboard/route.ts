import { authenticate } from '@/lib/auth';
import { api } from '@/lib/http';
import { getDashboard } from '@/modules/dashboard/service';

/** Subscription, scores, charity, participation and winnings in one response. */
export const GET = api(async (req) => getDashboard(await authenticate(req)));
