import type { Metadata } from 'next';
import { CharitiesManager } from '@/components/admin/charities-manager';
import { ADMIN_CHARITIES } from '@/content/admin';
import { requireAdmin } from '@/lib/auth-page';
import type { CharityEvent } from '@/lib/types';
import { listAllCharities } from '@/modules/charities/service';

export const metadata: Metadata = { title: 'Charities' };

export default async function AdminCharitiesPage() {
  const { admin } = await requireAdmin();
  const charities = await listAllCharities(admin);
  const ids = charities.map((c) => c.id);
  const { data: events } = ids.length
    ? await admin.from('charity_events').select('*').in('charity_id', ids).order('event_date')
    : { data: [] as CharityEvent[] };

  const withEvents = charities.map((c) => ({
    ...c,
    events: ((events ?? []) as CharityEvent[]).filter((e) => e.charity_id === c.id),
  }));

  return (
    <div className="container-page py-block">
      <h1 className="type-h2 mb-block text-fg">{ADMIN_CHARITIES.title}</h1>
      <CharitiesManager charities={withEvents} />
    </div>
  );
}
