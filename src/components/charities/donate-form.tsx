'use client';

import { Heart, Loader2 } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { Button, ButtonLink } from '@/components/ui/button';
import { Field, FormNotice, TextInput } from '@/components/ui/field';
import { Card } from '@/components/ui/surface';
import { CHARITY_DETAIL } from '@/content/charities-page';
import { apiPost, ApiClientError } from '@/lib/api-client';
import { cn } from '@/lib/cn';

const T = CHARITY_DETAIL.donate;
const QUICK_AMOUNTS = [10, 25, 50, 100];

/**
 * A one-off donation to this charity, independent of subscribing or playing (PRD section 08.1).
 * Any signed-in user can use it; `signedInHref` carries them to login and back if they are not.
 */
export function DonateForm({ charityId, charityName, signedIn, loginHref }: { charityId: string; charityName: string; signedIn: boolean; loginHref: string }) {
  const id = useId();
  const [amount, setAmount] = useState<number>(25);
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dollars = custom ? Number(custom) : amount;
  const valid = Number.isFinite(dollars) && dollars >= 1 && dollars <= 10_000;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      const { url } = await apiPost<{ url: string }>('/api/donations/checkout', {
        charity_id: charityId,
        amount_cents: Math.round(dollars * 100),
      });
      window.location.href = url;
    } catch (err) {
      setBusy(false);
      setError(err instanceof ApiClientError ? err.message : 'Could not start that donation.');
    }
  }

  if (!signedIn) {
    return (
      <Card variant="flat" className="border-line bg-surface">
        <h2 className="type-h4 text-fg">{T.title}</h2>
        <p className="type-body mt-2 text-fg-muted">{T.signInLead(charityName)}</p>
        <ButtonLink href={loginHref} variant="secondary" className="mt-4">
          <Heart className="size-4" aria-hidden />
          {T.signInCta}
        </ButtonLink>
      </Card>
    );
  }

  return (
    <Card variant="flat" className="border-line bg-surface">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <h2 className="type-h4 text-fg">{T.title}</h2>
          <p className="type-small mt-1 text-fg-muted">{T.lead(charityName)}</p>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label={T.amountLabel}>
          {QUICK_AMOUNTS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => {
                setAmount(n);
                setCustom('');
              }}
              className={cn(
                'inline-flex min-h-touch items-center rounded-pill border px-5 type-label transition-colors motion-base',
                !custom && amount === n ? 'border-action bg-action text-on-action' : 'border-line text-fg-muted hover:border-line-strong hover:text-fg',
              )}
            >
              ${n}
            </button>
          ))}
        </div>

        <Field label={T.customLabel} htmlFor={id}>
          <TextInput
            id={id}
            type="number"
            min={1}
            max={10_000}
            step={1}
            inputMode="decimal"
            placeholder={String(amount)}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />
        </Field>

        {error && <FormNotice>{error}</FormNotice>}

        <Button type="submit" disabled={busy || !valid}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : T.cta(dollars)}
        </Button>
      </form>
    </Card>
  );
}
