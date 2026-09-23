'use client';

import { Loader2 } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FormNotice, TextInput } from '@/components/ui/field';
import { Stack } from '@/components/ui/layout';
import { Card } from '@/components/ui/surface';
import { useToast } from '@/components/ui/toast';
import { DASHBOARD } from '@/content/dashboard';
import { apiPatch, ApiClientError } from '@/lib/api-client';
import type { Profile } from '@/lib/types';

const T = DASHBOARD.profile;

export function ProfilePanel({ fullName, email }: { fullName: string; email: string }) {
  const ids = { name: useId() };
  const toast = useToast();
  const [name, setName] = useState(fullName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (name === fullName) return;
    setBusy(true);
    setError(null);
    try {
      await apiPatch<{ profile: Profile }>('/api/me', { full_name: name });
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
          <Field label={T.nameLabel} htmlFor={ids.name}>
            <TextInput
              id={ids.name}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label={T.emailLabel} htmlFor="profile-email">
            <TextInput id="profile-email" value={email} disabled readOnly />
          </Field>
          {error && <FormNotice>{error}</FormNotice>}
          <Button type="submit" disabled={busy || name === fullName} className="self-start">
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : T.save}
          </Button>
        </Stack>
      </form>
    </Card>
  );
}
