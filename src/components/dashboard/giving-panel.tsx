'use client';

import { Loader2 } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FormNotice, Select } from '@/components/ui/field';
import { Stack } from '@/components/ui/layout';
import { Card } from '@/components/ui/surface';
import { useToast } from '@/components/ui/toast';
import { DASHBOARD } from '@/content/dashboard';
import { apiPatch, ApiClientError } from '@/lib/api-client';
import { CONFIG } from '@/lib/config';
import type { Profile } from '@/lib/types';

const T = DASHBOARD.giving;

export function GivingPanel({
  charityId,
  charityPercent,
  charities,
}: {
  charityId: string | null;
  charityPercent: number;
  charities: Array<{ id: string; name: string }>;
}) {
  const ids = { charity: useId(), percent: useId() };
  const toast = useToast();
  const [selected, setSelected] = useState(charityId ?? charities[0]?.id ?? '');
  const [percent, setPercent] = useState(charityPercent);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = selected !== charityId || percent !== charityPercent;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiPatch<{ profile: Profile }>('/api/me', { charity_id: selected, charity_percent: percent });
      toast({ title: T.saved, tone: 'success' });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not save that.');
    } finally {
      setBusy(false);
    }
  }

  if (charities.length === 0) {
    return (
      <Card>
        <Stack gap="md">
          <h2 className="type-h4 text-fg">{T.title}</h2>
          <p className="type-body text-fg-muted">{T.noneAvailable}</p>
        </Stack>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={onSubmit}>
        <Stack gap="lg">
          <div>
            <h2 className="type-h4 text-fg">{T.title}</h2>
            <p className="type-small mt-1 text-fg-muted">{T.lead}</p>
          </div>

          <Field label="Charity" htmlFor={ids.charity}>
            <Select id={ids.charity} value={selected} onChange={(e) => setSelected(e.target.value)}>
              {charities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>

          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor={ids.percent} className="type-label text-fg">
                {T.percentLabel}
              </label>
              <output htmlFor={ids.percent} className="type-num text-lg text-accent-text">
                {percent}%
              </output>
            </div>
            <input
              id={ids.percent}
              type="range"
              min={CONFIG.charity.minPercent}
              max={CONFIG.charity.maxPercent}
              step={1}
              value={percent}
              onChange={(e) => setPercent(Number(e.target.value))}
              className="mt-2 h-touch w-full cursor-pointer accent-action"
            />
            <div className="type-num mt-1 flex justify-between text-xs text-fg-muted">
              <span>{CONFIG.charity.minPercent}%</span>
              <span>{CONFIG.charity.maxPercent}%</span>
            </div>
          </div>

          {error && <FormNotice>{error}</FormNotice>}

          <Button type="submit" disabled={busy || !dirty} className="self-start">
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : T.save}
          </Button>
        </Stack>
      </form>
    </Card>
  );
}
