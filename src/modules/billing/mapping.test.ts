import { describe, expect, it } from 'vitest';
import { mapStripeStatus, periodEndIso } from './mapping';

describe('mapStripeStatus', () => {
  it('treats paid and trialing subscriptions as active', () => {
    expect(mapStripeStatus('active')).toBe('active');
    expect(mapStripeStatus('trialing')).toBe('active');
  });

  it('treats failed payments as past_due', () => {
    expect(mapStripeStatus('past_due')).toBe('past_due');
    expect(mapStripeStatus('unpaid')).toBe('past_due');
  });

  it('treats ended subscriptions as canceled', () => {
    expect(mapStripeStatus('canceled')).toBe('canceled');
    expect(mapStripeStatus('incomplete_expired')).toBe('canceled');
  });

  it('never grants access for a status it does not recognise', () => {
    for (const s of ['incomplete', 'paused', 'something_new', '']) expect(mapStripeStatus(s)).toBe('incomplete');
  });
});

describe('periodEndIso', () => {
  it('takes the latest period end across the subscription items', () => {
    const sub = { items: { data: [{ current_period_end: 1_800_000_000 }, { current_period_end: 1_800_086_400 }] } };
    expect(periodEndIso(sub)).toBe(new Date(1_800_086_400 * 1000).toISOString());
  });

  it('returns null when Stripe gives no period', () => {
    expect(periodEndIso({ items: { data: [] } })).toBeNull();
    expect(periodEndIso({ items: { data: [{}] } })).toBeNull();
  });
});
