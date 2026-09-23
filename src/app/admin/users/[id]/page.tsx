import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ScoresPanel } from '@/components/dashboard/scores-panel';
import { UserGivingForm } from '@/components/admin/user-giving-form';
import { UserProfileForm } from '@/components/admin/user-profile-form';
import { UserSubscriptionForm, type AdminSubscription } from '@/components/admin/user-subscription-form';
import { Grid, Stack } from '@/components/ui/layout';
import { Card } from '@/components/ui/surface';
import { EmptyRow, Table, Tbody, Td, Th, Thead, Tr } from '@/components/ui/table';
import { ADMIN_USER_DETAIL } from '@/content/admin';
import { formatMoney } from '@/lib/format';
import { requireAdmin } from '@/lib/auth-page';
import { getUser } from '@/modules/admin/service';
import type { Donation, Score, Winner } from '@/lib/types';

export const metadata: Metadata = { title: 'Member' };

const T = ADMIN_USER_DETAIL;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { admin, userId: actorId } = await requireAdmin();
  const [detail, charityRows, planRows] = await Promise.all([
    getUser(admin, id).catch(() => null),
    admin.from('charities').select('id, name').eq('is_active', true).order('name'),
    admin.from('plans').select('code, name, price_cents').eq('is_active', true).order('price_cents'),
  ]);
  if (!detail) notFound();

  const { profile, subscription, scores, winnings, donations, charity } = detail;
  const charities = (charityRows.data ?? []) as Array<{ id: string; name: string }>;
  const plans = (planRows.data ?? []) as Array<{ code: 'monthly' | 'yearly'; name: string; price_cents: number }>;
  const currentCharity = charity as { name: string } | null;

  return (
    <div className="container-page py-block">
      <Link href="/admin/users" className="type-small mb-block inline-flex items-center gap-2 text-fg-muted transition-colors motion-base hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden />
        {T.back}
      </Link>

      <Stack gap="sm" className="mb-block">
        <h1 className="type-h2 text-fg">{profile.full_name || profile.email}</h1>
        <p className="type-body text-fg-muted">{profile.email}</p>
      </Stack>

      <Grid cols={2} className="items-start">
        <Stack gap="lg">
          <UserProfileForm user={profile} isSelf={profile.id === actorId} />
          <UserSubscriptionForm userId={profile.id} subscription={subscription as AdminSubscription | null} plans={plans} />
          <ScoresPanel
            scores={scores as Score[]}
            canEdit
            addUrl={`/api/admin/users/${profile.id}/scores`}
            itemBaseUrl="/api/admin/scores"
            title={T.scores.title}
            lead=""
            showSubscriberNotice={false}
          />
        </Stack>

        <Stack gap="lg">
          <UserGivingForm userId={profile.id} charityId={profile.charity_id} charityPercent={profile.charity_percent} charities={charities} />

          <Card>
            <h2 className="type-h4 mb-4 text-fg">{T.winnings.title}</h2>
            <Table>
              <Thead>
                <Tr>
                  <Th>Tier</Th>
                  <Th>Prize</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {(winnings as Winner[]).length === 0 ? (
                  <EmptyRow colSpan={3}>{T.winnings.none}</EmptyRow>
                ) : (
                  (winnings as Winner[]).map((w) => (
                    <Tr key={w.id}>
                      <Td>{w.tier}-match</Td>
                      <Td className="type-num">{formatMoney(w.prize_cents)}</Td>
                      <Td className="text-fg-muted">
                        {w.verification_status} {'·'} {w.payout_status}
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </Card>

          <Card>
            <h2 className="type-h4 mb-4 text-fg">{T.donations.title}</h2>
            <Table>
              <Thead>
                <Tr>
                  <Th>Amount</Th>
                  <Th>Date</Th>
                </Tr>
              </Thead>
              <Tbody>
                {(donations as Donation[]).length === 0 ? (
                  <EmptyRow colSpan={2}>{T.donations.none}</EmptyRow>
                ) : (
                  (donations as Donation[]).map((d) => (
                    <Tr key={d.id}>
                      <Td className="type-num">{formatMoney(d.amount_cents)}</Td>
                      <Td className="text-fg-muted">{formatDate(d.created_at)}</Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </Card>

          {currentCharity && (
            <p className="type-small text-fg-muted">
              Currently giving to <span className="text-fg">{currentCharity.name}</span>.
            </p>
          )}
        </Stack>
      </Grid>
    </div>
  );
}
