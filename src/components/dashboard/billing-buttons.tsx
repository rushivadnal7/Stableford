'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormNotice } from '@/components/ui/field';
import { apiPost } from '@/lib/api-client';

/** Any button that starts a Stripe-hosted flow: request the URL, then leave. */
function useStripeRedirect() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const go = async (path: string, body?: unknown) => {
    setBusy(true);
    setError(null);
    try {
      const { url } = await apiPost<{ url: string }>(path, body);
      location.href = url;
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };
  return { busy, error, go };
}

export function ManageBillingButton({ label }: { label: string }) {
  const { busy, error, go } = useStripeRedirect();
  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="secondary" onClick={() => go('/api/billing/portal')} disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : label}
      </Button>
      {error && <FormNotice>{error}</FormNotice>}
    </div>
  );
}

export function SubscribeButton({ planCode, label }: { planCode: 'monthly' | 'yearly'; label: string }) {
  const { busy, error, go } = useStripeRedirect();
  return (
    <div className="flex flex-col gap-2">
      <Button type="button" size="lg" arrow onClick={() => go('/api/checkout', { plan_code: planCode })} disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : label}
      </Button>
      {error && <FormNotice>{error}</FormNotice>}
    </div>
  );
}
