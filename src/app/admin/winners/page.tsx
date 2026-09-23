import type { Metadata } from 'next';
import Link from 'next/link';
import { WinnersReviewTable, type WinnerRow } from '@/components/admin/winners-review-table';
import { Cluster, Stack } from '@/components/ui/layout';
import { ADMIN_WINNERS } from '@/content/admin';
import { cn } from '@/lib/cn';
import { requireAdmin } from '@/lib/auth-page';
import { listWinners } from '@/modules/winners/service';

export const metadata: Metadata = { title: 'Winners' };
const T = ADMIN_WINNERS;

const VERIFICATION_FILTERS = ['submitted', 'awaiting_proof', 'approved', 'rejected'] as const;
const PAYOUT_FILTERS = ['pending', 'paid'] as const;

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex min-h-touch items-center rounded-pill border px-4 type-label capitalize transition-colors motion-base',
        active ? 'border-action bg-action text-on-action' : 'border-line text-fg-muted hover:border-line-strong hover:text-fg',
      )}
    >
      {children}
    </Link>
  );
}

export default async function AdminWinnersPage({ searchParams }: { searchParams: Promise<{ verification?: string; payout?: string }> }) {
  const { admin } = await requireAdmin();
  const { verification, payout } = await searchParams;
  const { items } = await listWinners(admin, {
    verification: verification as never,
    payout: payout as never,
    limit: 100,
    offset: 0,
  });

  const qs = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const next = { verification, payout, ...patch };
    if (next.verification) params.set('verification', next.verification);
    if (next.payout) params.set('payout', next.payout);
    const s = params.toString();
    return s ? `/admin/winners?${s}` : '/admin/winners';
  };

  return (
    <div className="container-page py-block">
      <Stack gap="lg" className="mb-block">
        <h1 className="type-h2 text-fg">{T.title}</h1>

        <div>
          <p className="type-small mb-2 text-fg-muted">{T.filters.verification}</p>
          <Cluster gap="sm">
            <FilterLink href={qs({ verification: undefined })} active={!verification}>
              {T.filters.all}
            </FilterLink>
            {VERIFICATION_FILTERS.map((v) => (
              <FilterLink key={v} href={qs({ verification: v })} active={verification === v}>
                {v.replace('_', ' ')}
              </FilterLink>
            ))}
          </Cluster>
        </div>

        <div>
          <p className="type-small mb-2 text-fg-muted">{T.filters.payout}</p>
          <Cluster gap="sm">
            <FilterLink href={qs({ payout: undefined })} active={!payout}>
              {T.filters.all}
            </FilterLink>
            {PAYOUT_FILTERS.map((p) => (
              <FilterLink key={p} href={qs({ payout: p })} active={payout === p}>
                {p}
              </FilterLink>
            ))}
          </Cluster>
        </div>
      </Stack>

      <WinnersReviewTable winners={items as unknown as WinnerRow[]} />
    </div>
  );
}
