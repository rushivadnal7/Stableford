'use client';

import { ChevronDown, Plus } from 'lucide-react';
import { useState } from 'react';
import { CharityEvents } from '@/components/admin/charity-events';
import { CharityForm, type CharityWithImage } from '@/components/admin/charity-form';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/surface';
import { useToast } from '@/components/ui/toast';
import { ADMIN_CHARITIES } from '@/content/admin';
import { apiDelete, ApiClientError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import type { CharityEvent } from '@/lib/types';

const T = ADMIN_CHARITIES;

interface Row extends CharityWithImage {
  events?: CharityEvent[];
}

export function CharitiesManager({ charities: initial }: { charities: Row[] }) {
  const toast = useToast();
  const [charities, setCharities] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function remove(charity: Row) {
    if (!confirm(T.deleteConfirm)) return;
    try {
      const result = await apiDelete<{ deleted: boolean; deactivated: boolean }>(`/api/admin/charities/${charity.id}`);
      if (result.deleted) {
        setCharities((list) => list.filter((c) => c.id !== charity.id));
        toast({ title: 'Charity deleted.', tone: 'success' });
      } else {
        setCharities((list) => list.map((c) => (c.id === charity.id ? { ...c, is_active: false, is_featured: false } : c)));
        toast({ title: 'Charity hidden (it has history, so it was deactivated instead of deleted).', tone: 'info' });
      }
    } catch (err) {
      toast({ title: err instanceof ApiClientError ? err.message : 'Could not delete that charity.', tone: 'danger' });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {!creating && (
        <Button type="button" variant="secondary" onClick={() => setCreating(true)} className="self-start">
          <Plus className="size-4" aria-hidden />
          {T.new}
        </Button>
      )}
      {creating && (
        <CharityForm
          onCancel={() => setCreating(false)}
          onSaved={(charity) => {
            setCharities((list) => [{ ...charity, events: [] }, ...list]);
            setCreating(false);
          }}
        />
      )}

      <ul className="flex flex-col gap-3">
        {charities.length === 0 && !creating && <p className="type-body text-fg-muted">{T.empty}</p>}
        {charities.map((charity) => {
          const editing = editingId === charity.id;
          const expanded = expandedId === charity.id;
          return (
            <li key={charity.id} className="rounded-lg border border-line">
              <div className="flex flex-wrap items-center gap-3 p-card">
                <div className="min-w-0 flex-1">
                  <p className="type-label text-fg">{charity.name}</p>
                  <p className="type-small text-fg-muted capitalize">{charity.category}</p>
                </div>
                {charity.is_featured && <Badge variant="accent">Featured</Badge>}
                <Badge variant={charity.is_active ? 'accent' : 'neutral'}>{charity.is_active ? 'Visible' : 'Hidden'}</Badge>
                <Button type="button" size="sm" variant="secondary" onClick={() => setEditingId(editing ? null : charity.id)}>
                  {T.edit}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setExpandedId(expanded ? null : charity.id)}>
                  {T.events.title}
                  <ChevronDown className={cn('size-4 transition-transform motion-base', expanded && 'rotate-180')} aria-hidden />
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => remove(charity)}>
                  {T.delete}
                </Button>
              </div>

              {editing && (
                <div className="border-t border-line p-card">
                  <CharityForm
                    charity={charity}
                    onCancel={() => setEditingId(null)}
                    onSaved={(updated) => {
                      setCharities((list) => list.map((c) => (c.id === charity.id ? { ...c, ...updated } : c)));
                      setEditingId(null);
                    }}
                  />
                </div>
              )}

              {expanded && (
                <div className="border-t border-line p-card">
                  <CharityEvents charityId={charity.id} events={charity.events ?? []} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
