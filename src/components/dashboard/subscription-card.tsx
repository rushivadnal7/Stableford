import { ManageBillingButton, SubscribeButton } from '@/components/dashboard/billing-buttons';
import { Badge, Card } from '@/components/ui/surface';
import { Stack } from '@/components/ui/layout';
import { DASHBOARD } from '@/content/dashboard';
import { formatMoney } from '@/lib/format';

const T = DASHBOARD.subscription;

export interface SubscriptionInfo {
  active: boolean;
  /** The subscription_status enum value, or "none" when there has never been a subscription row. */
  status: string;
  plan: { name: string; interval: string; price_cents: number } | null;
  renewal_date: string | null;
  cancel_at_period_end: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  active: T.active,
  past_due: T.pastDue,
  canceled: T.canceled,
  incomplete: T.pastDue,
  none: T.none,
};
const STATUS_TONE: Record<string, 'accent' | 'neutral'> = {
  active: 'accent',
  past_due: 'neutral',
  canceled: 'neutral',
  incomplete: 'neutral',
  none: 'neutral',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function SubscriptionCard({
  subscription,
  hasCharity,
  cheapestPlan,
}: {
  subscription: SubscriptionInfo;
  hasCharity: boolean;
  cheapestPlan: { code: 'monthly' | 'yearly'; name: string; price_cents: number };
}) {
  return (
    <Card>
      <Stack gap="md">
        <div className="flex items-center justify-between">
          <h2 className="type-h4 text-fg">{T.title}</h2>
          <Badge variant={STATUS_TONE[subscription.status] ?? 'neutral'}>{STATUS_LABEL[subscription.status] ?? subscription.status}</Badge>
        </div>

        {subscription.plan && (
          <p className="type-body text-fg-muted">
            {subscription.plan.name} · {formatMoney(subscription.plan.price_cents)}/{subscription.plan.interval}
          </p>
        )}
        {subscription.renewal_date &&
          (subscription.cancel_at_period_end ? (
            <p className="type-small text-fg-muted">{T.endsAt(formatDate(subscription.renewal_date))}</p>
          ) : (
            <p className="type-small text-fg-muted">{T.renews(formatDate(subscription.renewal_date))}</p>
          ))}

        {subscription.active ? (
          <ManageBillingButton label={T.manage} />
        ) : !hasCharity ? (
          <p className="type-small text-fg-muted">{T.chooseCharityFirst}</p>
        ) : (
          <SubscribeButton planCode={cheapestPlan.code} label={T.subscribe(cheapestPlan.name, formatMoney(cheapestPlan.price_cents))} />
        )}
      </Stack>
    </Card>
  );
}
