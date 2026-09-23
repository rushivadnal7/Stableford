'use client';

import { Loader2 } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FormNotice, Select } from '@/components/ui/field';
import { Stack } from '@/components/ui/layout';
import { Card } from '@/components/ui/surface';
import { ADMIN_USER_DETAIL } from '@/content/admin';
import { apiPatch, ApiClientError } from '@/lib/api-client';
import { CONFIG } from '@/lib/config';

const T = ADMIN_USER_DETAIL.giving;

/** The admin equivalent of the member's own giving panel: same fields, PATCHes on someone else's behalf. */
export function UserGivingForm({
  userId,
  charityId,
  charityPercent,
  charities,
}: {
  userId: string;
  charityId: string | null;
  charityPercent: number;
  charities: Array<{ id: string; name: string }>;
}) {
  const ids = { charity: useId(), percent: useId() };
  const [selected, setSelected] = useState(charityId ?? '');
  const [percent, setPercent] = useState(charityPercent);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const dirty = selected !== (charityId ?? '') || percent !== charityPercent;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const patch: Record<string, unknown> = { charity_percent: percent };
      if (selected) patch.charity_id = selected;
      await apiPatch(`/api/admin/users/${userId}`, patch);
      setSaved(true);
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

          {charities.length === 0 ? (
            <p className="type-body text-fg-muted">{T.none}</p>
          ) : (
            <Field label={T.charityLabel} htmlFor={ids.charity}>
              <Select
                id={ids.charity}
                value={selected}
                onChange={(e) => {
                  setSelected(e.target.value);
                  setSaved(false);
                }}
              >
                <option value="">{T.none}</option>
                {charities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}

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
              onChange={(e) => {
                setPercent(Number(e.target.value));
                setSaved(false);
              }}
              className="mt-2 h-touch w-full cursor-pointer accent-action"
            />
          </div>

          {error && <FormNotice>{error}</FormNotice>}
          {saved && !error && <FormNotice tone="success">{T.saved}</FormNotice>}

          <Button type="submit" disabled={busy || !dirty} className="self-start">
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : T.save}
          </Button>
        </Stack>
      </form>
    </Card>
  );
}
