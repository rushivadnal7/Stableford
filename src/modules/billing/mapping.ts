import type { SubscriptionStatus } from '@/lib/types';

/**
 * Collapse Stripe's many subscription states into the four we act on.
 *  active: paid and running (a trial counts)          past_due: a payment failed
 *  canceled: ended                                    incomplete: not yet paid, or anything new we do not know
 * Only `active` grants access (see is_active_subscriber in the database).
 */
export function mapStripeStatus(status: string): SubscriptionStatus {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'canceled':
    case 'incomplete_expired':
      return 'canceled';
    default:
      return 'incomplete';
  }
}

/**
 * Current billing period end as an ISO string. Recent Stripe API versions keep the period on the
 * subscription items rather than on the subscription itself; take the latest across items.
 */
export function periodEndIso(subscription: { items: { data: Array<{ current_period_end?: number }> } }): string | null {
  const ends = subscription.items.data.map((item) => item.current_period_end).filter((n): n is number => typeof n === 'number');
  return ends.length ? new Date(Math.max(...ends) * 1000).toISOString() : null;
}
