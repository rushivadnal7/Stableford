'use client';

import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FormNotice, TextInput } from '@/components/ui/field';
import { Stack } from '@/components/ui/layout';
import { useToast } from '@/components/ui/toast';
import { ADMIN_CHARITIES } from '@/content/admin';
import { apiDelete, apiPost, ApiClientError } from '@/lib/api-client';
import type { CharityEvent } from '@/lib/types';

const T = ADMIN_CHARITIES.events;

function EventForm({ charityId, onSaved, onCancel }: { charityId: string; onSaved: (event: CharityEvent) => void; onCancel: () => void }) {
  const ids = { title: useId(), date: useId(), location: useId(), description: useId() };
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await apiPost<{ event: CharityEvent }>(`/api/admin/charities/${charityId}/events`, {
        title,
        event_date: eventDate,
        location: location || undefined,
        description: description || undefined,
      });
      onSaved(res.event);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not save that event.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-lg border border-line bg-canvas p-card">
      <Field label={T.titleLabel} htmlFor={ids.title} required>
        <TextInput id={ids.title} required value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label={T.dateLabel} htmlFor={ids.date} required>
        <TextInput id={ids.date} type="date" required value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
      </Field>
      <Field label={T.locationLabel} htmlFor={ids.location}>
        <TextInput id={ids.location} value={location} onChange={(e) => setLocation(e.target.value)} />
      </Field>
      <Field label={T.descriptionLabel} htmlFor={ids.description}>
        <TextInput id={ids.description} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      {error && <FormNotice>{error}</FormNotice>}
      <div className="flex gap-3">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : T.save}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function CharityEvents({ charityId, events: initialEvents }: { charityId: string; events: CharityEvent[] }) {
  const toast = useToast();
  const [events, setEvents] = useState(initialEvents);
  const [adding, setAdding] = useState(false);

  async function remove(id: string) {
    if (!confirm('Delete this event?')) return;
    try {
      await apiDelete(`/api/admin/events/${id}`);
      setEvents((list) => list.filter((e) => e.id !== id));
      toast({ title: 'Event deleted.', tone: 'success' });
    } catch {
      toast({ title: 'Could not delete that event.', tone: 'danger' });
    }
  }

  return (
    <Stack gap="md" className="rounded-lg border border-line p-card">
      <div className="flex items-center justify-between">
        <h3 className="type-label text-fg">{T.title}</h3>
        {!adding && (
          <Button type="button" size="sm" variant="secondary" onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden />
            {T.add}
          </Button>
        )}
      </div>

      {events.length === 0 && !adding && <p className="type-small text-fg-muted">{T.empty}</p>}

      <Stack as="ul" gap="sm">
        {events.map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2">
            <div>
              <p className="type-small text-fg">{e.title}</p>
              <p className="type-caption text-fg-muted">
                {e.event_date}
                {e.location ? ` · ${e.location}` : ''}
              </p>
            </div>
            <button
              type="button"
              aria-label={`Delete ${e.title}`}
              onClick={() => remove(e.id)}
              className="grid size-touch shrink-0 place-items-center rounded-pill text-fg-muted transition-colors motion-base hover:bg-danger/10 hover:text-danger"
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </li>
        ))}
      </Stack>

      {adding && (
        <EventForm
          charityId={charityId}
          onCancel={() => setAdding(false)}
          onSaved={(event) => {
            setEvents((list) => [...list, event]);
            setAdding(false);
            toast({ title: 'Event added.', tone: 'success' });
          }}
        />
      )}
    </Stack>
  );
}
