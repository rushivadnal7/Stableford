import type { Metadata } from 'next';
import { DrawsPanel } from '@/components/dashboard/draws-panel';
import { GivingPanel } from '@/components/dashboard/giving-panel';
import { ProfilePanel } from '@/components/dashboard/profile-panel';
import { ScoresPanel } from '@/components/dashboard/scores-panel';
import { SubscriptionCard, type SubscriptionInfo } from '@/components/dashboard/subscription-card';
import { WinningsPanel } from '@/components/dashboard/winnings-panel';
import { Eyebrow } from '@/components/ui/heading';
import { Grid, Stack } from '@/components/ui/layout';
import { Section } from '@/components/ui/section';
import { FormNotice } from '@/components/ui/field';
import { DASHBOARD } from '@/content/dashboard';
import { unwrap } from '@/lib/db';
import { requireUser } from '@/lib/auth-page';
import { getDashboard } from '@/modules/dashboard/service';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const { checkout } = await searchParams;
  const user = await requireUser();
  const [dashboard, charityRows] = await Promise.all([
    getDashboard(user),
    user.db.from('charities').select('id, name').eq('is_active', true).order('name'),
  ]);
  const charities = (unwrap(charityRows) as Array<{ id: string; name: string }>) ?? [];
  const cheapestPlan = unwrap(
    await user.db.from('plans').select('code, name, price_cents').eq('is_active', true).order('price_cents').limit(1),
  ) as Array<{ code: 'monthly' | 'yearly'; name: string; price_cents: number }>;

  // The embedded `plan:plans(...)` join comes back loosely typed (Supabase cannot know its shape
  // without generated types); this is the one place that trusts it, matching /api/me's own cast.
  const subscription: SubscriptionInfo = {
    ...dashboard.subscription,
    plan: dashboard.subscription.plan as SubscriptionInfo['plan'],
  };

  return (
    <Section>
      <Stack gap="lg" className="mb-block">
        <Eyebrow>{DASHBOARD.welcomeBack(user.profile.full_name)}</Eyebrow>
        {checkout === 'success' && <FormNotice tone="success">{DASHBOARD.checkoutSuccess}</FormNotice>}
      </Stack>

      <Grid cols={2} className="items-start">
        <Stack gap="lg">
          <SubscriptionCard
            subscription={subscription}
            hasCharity={!!user.profile.charity_id}
            cheapestPlan={cheapestPlan[0] ?? { code: 'monthly', name: 'Monthly', price_cents: 1000 }}
          />
          <ScoresPanel scores={dashboard.scores} canEdit={dashboard.subscription.active} />
          <WinningsPanel
            items={dashboard.winnings.items}
            totalCents={dashboard.winnings.total_won_cents}
            paidCents={dashboard.winnings.paid_cents}
            pendingCents={dashboard.winnings.pending_cents}
          />
        </Stack>
        <Stack gap="lg">
          <DrawsPanel
            upcomingPeriod={dashboard.participation.upcoming_period}
            eligible={dashboard.participation.eligible_for_upcoming}
            drawsEntered={dashboard.participation.draws_entered}
            recent={dashboard.participation.recent}
          />
          <GivingPanel charityId={user.profile.charity_id} charityPercent={user.profile.charity_percent} charities={charities} />
          <ProfilePanel fullName={user.profile.full_name} email={user.profile.email} />
        </Stack>
      </Grid>
    </Section>
  );
}
