'use client';

import { Loader2 } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, FormNotice, Select } from '@/components/ui/field';
import { Stack } from '@/components/ui/layout';
import { Card } from '@/components/ui/surface';
import { useToast } from '@/components/ui/toast';
import { ADMIN_USER_DETAIL } from '@/content/admin';
import { apiPut, ApiClientError } from '@/lib/api-client';
import { formatMoney } from '@/lib/format';

const T = ADMIN_USER_DETAIL.subscription;
const STATUSES = ['incomplete', 'active', 'past_due', 'canceled'] as const;

export interface AdminSubscription {
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  plan: { code: 'monthly' | 'yearly'; name: string } | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** A manual override (support/demo use, ADM-03). The next real Stripe webhook still wins. */
export function UserSubscriptionForm({ userId, subscription, plans }: { userId: string; subscription: AdminSubscription | null; plans: Array<{ code: 'monthly' | 'yearly'; name: string; price_cents: number }> }) {
  const ids = { plan: useId(), status: useId() };
  const toast = useToast();
  const [planCode, setPlanCode] = useState<'monthly' | 'yearly'>(subscription?.plan?.code ?? plans[0]?.code ?? 'monthly');
  const [status, setStatus] = useState(subscription?.status ?? 'active');
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(subscription?.cancel_at_period_end ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiPut(`/api/admin/users/${userId}/subscription`, { plan_code: planCode, status, cancel_at_period_end: cancelAtPeriodEnd });
      toast({ title: T.saved, tone: 'success' });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not save that.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <form onSubmit={onSubmit}>
        <Stack gap="lg">
          <h2 className="type-h4 text-fg">{T.title}</h2>

          {subscription ? (
            <p className="type-small text-fg-muted">
              {subscription.plan?.name ?? '—'}
              {subscription.current_period_end &&
                ` · ${subscription.cancel_at_period_end ? 'ends' : 'renews'} ${formatDate(subscription.current_period_end)}`}
            </p>
          ) : (
            <p className="type-small text-fg-muted">{T.none}</p>
          )}

          <Field label={T.planLabel} htmlFor={ids.plan}>
            <Select id={ids.plan} value={planCode} onChange={(e) => setPlanCode(e.target.value as 'monthly' | 'yearly')}>
              {plans.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name} ({formatMoney(p.price_cents)})
                </option>
              ))}
            </Select>
          </Field>

          <Field label={T.statusLabel} htmlFor={ids.status}>
            <Select id={ids.status} value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>

          <Checkbox label={T.cancelLabel} checked={cancelAtPeriodEnd} onChange={(e) => setCancelAtPeriodEnd(e.target.checked)} />

          {error && <FormNotice>{error}</FormNotice>}

          <Button type="submit" disabled={busy} className="self-start">
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : T.save}
          </Button>
        </Stack>
      </form>
    </Card>
  );
}
