'use client';

import { Loader2 } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FormNotice, Select, TextInput } from '@/components/ui/field';
import { Stack } from '@/components/ui/layout';
import { Card } from '@/components/ui/surface';
import { useToast } from '@/components/ui/toast';
import { ADMIN_USER_DETAIL } from '@/content/admin';
import { apiPatch, ApiClientError } from '@/lib/api-client';
import type { Profile } from '@/lib/types';

const T = ADMIN_USER_DETAIL.profile;

/** Name and role. Role is protected server-side: an admin cannot demote themselves (see updateUser()). */
export function UserProfileForm({ user, isSelf }: { user: Profile; isSelf: boolean }) {
  const ids = { name: useId(), role: useId() };
  const toast = useToast();
  const [name, setName] = useState(user.full_name);
  const [role, setRole] = useState<'member' | 'admin'>(user.role);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = name !== user.full_name || role !== user.role;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiPatch(`/api/admin/users/${user.id}`, { full_name: name, role });
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
            <TextInput id={ids.name} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label={T.roleLabel} htmlFor={ids.role} hint={isSelf ? T.cannotDemoteSelf : undefined}>
            <Select id={ids.role} value={role} disabled={isSelf} onChange={(e) => setRole(e.target.value as 'member' | 'admin')}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </Select>
          </Field>
          {error && <FormNotice>{error}</FormNotice>}
          <Button type="submit" disabled={busy || !dirty} className="self-start">
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : T.save}
          </Button>
        </Stack>
      </form>
    </Card>
  );
}
