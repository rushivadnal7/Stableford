'use client';

import { Loader2, Plus } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Field, FormNotice, Select, TextInput } from '@/components/ui/field';
import { ADMIN_DRAWS } from '@/content/admin';
import { apiPost, ApiClientError } from '@/lib/api-client';
import type { Draw } from '@/lib/types';

const T = ADMIN_DRAWS;

function currentPeriod() {
  return new Date().toISOString().slice(0, 7);
}

export function DrawCreateForm() {
  const router = useRouter();
  const ids = { period: useId(), mode: useId(), weighting: useId() };
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState(currentPeriod());
  const [mode, setMode] = useState<'random' | 'algorithmic'>('random');
  const [weighting, setWeighting] = useState<'common' | 'rare'>('common');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden />
        {T.new}
      </Button>
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { draw } = await apiPost<{ draw: Draw }>('/api/admin/draws', {
        period,
        mode,
        weighting: mode === 'algorithmic' ? weighting : undefined,
      });
      router.push(`/admin/draws/${draw.id}`);
    } catch (err) {
      setBusy(false);
      setError(err instanceof ApiClientError ? err.message : 'Could not create that draw.');
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-lg border border-line bg-canvas-alt p-card sm:flex-row sm:items-end sm:flex-wrap">
      <Field label={T.periodLabel} htmlFor={ids.period} className="sm:w-40">
        <TextInput id={ids.period} required pattern="\d{4}-\d{2}" placeholder="2026-09" value={period} onChange={(e) => setPeriod(e.target.value)} />
      </Field>
      <Field label={T.modeLabel} htmlFor={ids.mode} className="sm:w-48">
        <Select id={ids.mode} value={mode} onChange={(e) => setMode(e.target.value as 'random' | 'algorithmic')}>
          <option value="random">Random</option>
          <option value="algorithmic">Algorithmic</option>
        </Select>
      </Field>
      {mode === 'algorithmic' && (
        <Field label={T.weightingLabel} htmlFor={ids.weighting} className="sm:w-48">
          <Select id={ids.weighting} value={weighting} onChange={(e) => setWeighting(e.target.value as 'common' | 'rare')}>
            <option value="common">Favour common numbers</option>
            <option value="rare">Favour rare numbers</option>
          </Select>
        </Field>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : T.create}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </Button>
      </div>
      {error && (
        <div className="sm:basis-full">
          <FormNotice>{error}</FormNotice>
        </div>
      )}
    </form>
  );
}
