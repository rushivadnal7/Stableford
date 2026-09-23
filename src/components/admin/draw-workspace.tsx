'use client';

import { Loader2 } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FormNotice, Select } from '@/components/ui/field';
import { Grid, Stack } from '@/components/ui/layout';
import { Badge, Card } from '@/components/ui/surface';
import { EmptyRow, Table, Tbody, Td, Th, Thead, Tr } from '@/components/ui/table';
import { ADMIN_DRAW_DETAIL } from '@/content/admin';
import { apiPatch, apiPost, ApiClientError } from '@/lib/api-client';
import { formatMoney } from '@/lib/format';
import type { Draw, DrawTier } from '@/lib/types';

const T = ADMIN_DRAW_DETAIL;

interface PreviewRow {
  user_id: string;
  numbers: number[];
  match_count: number | null;
  profile: { email: string; full_name: string } | null;
}
interface WinnerRow {
  id: string;
  user_id: string;
  tier: 3 | 4 | 5;
  prize_cents: number;
  numbers?: number[];
  profile: { email: string; full_name: string } | null;
}
interface DrawDetail {
  draw: Draw;
  tiers: DrawTier[];
  winners: { preview: boolean; rows: (PreviewRow | WinnerRow)[] };
}

function formatDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : null;
}

export function DrawWorkspace({ initial }: { initial: DrawDetail }) {
  const [detail, setDetail] = useState(initial);
  const [mode, setMode] = useState(initial.draw.mode);
  const [weighting, setWeighting] = useState<'common' | 'rare'>(initial.draw.weighting ?? 'common');
  const [busy, setBusy] = useState<'mode' | 'simulate' | 'publish' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ids = { mode: useId(), weighting: useId() };

  const { draw, tiers, winners } = detail;
  const isDraft = draw.status === 'draft';
  const isSimulated = !!draw.simulated_at;

  async function saveMode() {
    setBusy('mode');
    setError(null);
    try {
      await apiPatch<{ draw: Draw }>(`/api/admin/draws/${draw.id}`, { mode, weighting: mode === 'algorithmic' ? weighting : undefined });
      // Changing the mode clears any earlier simulation server-side; reflect that locally too.
      setDetail((d) => ({ ...d, draw: { ...d.draw, mode, weighting: mode === 'algorithmic' ? weighting : null, simulated_at: null, numbers: null }, tiers: [], winners: { preview: true, rows: [] } }));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not save that.');
    } finally {
      setBusy(null);
    }
  }

  async function runSimulation() {
    setBusy('simulate');
    setError(null);
    try {
      const result = await apiPost<DrawDetail>(`/api/admin/draws/${draw.id}/simulate`);
      setDetail(result);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not run the simulation.');
    } finally {
      setBusy(null);
    }
  }

  async function publish() {
    if (!confirm(T.publish.confirm)) return;
    setBusy('publish');
    setError(null);
    try {
      const result = await apiPost<DrawDetail>(`/api/admin/draws/${draw.id}/publish`);
      setDetail(result);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not publish this draw.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Stack gap="lg">
      {error && <FormNotice>{error}</FormNotice>}

      <Grid cols={2} className="items-start">
        <Card>
          <Stack gap="md">
            <h2 className="type-h4 text-fg">{T.modeCard.title}</h2>
            {isDraft ? (
              <>
                <Field label="Mode" htmlFor={ids.mode}>
                  <Select id={ids.mode} value={mode} onChange={(e) => setMode(e.target.value as Draw['mode'])}>
                    <option value="random">Random</option>
                    <option value="algorithmic">Algorithmic</option>
                  </Select>
                </Field>
                {mode === 'algorithmic' && (
                  <Field label="Weighting" htmlFor={ids.weighting}>
                    <Select id={ids.weighting} value={weighting} onChange={(e) => setWeighting(e.target.value as 'common' | 'rare')}>
                      <option value="common">Favour common numbers</option>
                      <option value="rare">Favour rare numbers</option>
                    </Select>
                  </Field>
                )}
                <Button type="button" variant="secondary" onClick={saveMode} disabled={busy === 'mode'} className="self-start">
                  {busy === 'mode' ? <Loader2 className="size-4 animate-spin" aria-hidden /> : T.modeCard.save}
                </Button>
              </>
            ) : (
              <p className="type-body text-fg-muted">
                {draw.mode}
                {draw.weighting ? ` (${draw.weighting})` : ''} {'—'} {T.modeCard.lockedNote}
              </p>
            )}
          </Stack>
        </Card>

        <Card>
          <Stack gap="md">
            <h2 className="type-h4 text-fg">{T.snapshot.title}</h2>
            {isSimulated || draw.status === 'published' ? (
              <Stack gap="sm">
                <Row label={T.snapshot.activeSubscribers} value={draw.active_subscribers} />
                <Row label={T.snapshot.eligibleEntries} value={draw.eligible_entries} />
                <Row label={T.snapshot.basePool} value={formatMoney(draw.base_pool_cents)} />
                <Row label={T.snapshot.rolloverIn} value={formatMoney(draw.rollover_in_cents)} />
                <Row label={T.snapshot.totalPool} value={formatMoney(draw.total_pool_cents)} />
              </Stack>
            ) : (
              <p className="type-body text-fg-muted">{T.simulate.never}</p>
            )}
          </Stack>
        </Card>
      </Grid>

      {isDraft && (
        <Card>
          <Stack gap="md">
            <h2 className="type-h4 text-fg">{T.simulate.title}</h2>
            <p className="type-body text-fg-muted">{T.simulate.lead}</p>
            {isSimulated && <p className="type-small text-fg-muted">{T.simulate.last(formatDate(draw.simulated_at)!)}</p>}
            <Button type="button" onClick={runSimulation} disabled={busy === 'simulate'} className="self-start">
              {busy === 'simulate' ? <Loader2 className="size-4 animate-spin" aria-hidden /> : isSimulated ? T.simulate.rerun : T.simulate.run}
            </Button>
          </Stack>
        </Card>
      )}

      {tiers.length > 0 && (
        <Card>
          <h2 className="type-h4 mb-4 text-fg">{T.tiers.title}</h2>
          <Table>
            <Thead>
              <Tr>
                <Th>{T.tiers.tier}</Th>
                <Th>{T.tiers.winners}</Th>
                <Th>{T.tiers.pool}</Th>
                <Th>{T.tiers.each}</Th>
                <Th>{T.tiers.rolledOver}</Th>
              </Tr>
            </Thead>
            <Tbody>
              {tiers.map((t) => (
                <Tr key={t.tier}>
                  <Td>{t.tier}-match</Td>
                  <Td className="type-num">{t.winner_count}</Td>
                  <Td className="type-num">{formatMoney(t.pool_cents)}</Td>
                  <Td className="type-num">{t.winner_count > 0 ? formatMoney(t.prize_each_cents) : '—'}</Td>
                  <Td className="type-num">{t.rolled_over_cents > 0 ? formatMoney(t.rolled_over_cents) : '—'}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Card>
      )}

      {isDraft && isSimulated && (
        <Card>
          <Stack gap="md">
            <h2 className="type-h4 text-fg">{T.publish.title}</h2>
            <p className="type-body text-fg-muted">{T.publish.lead}</p>
            <Button type="button" onClick={publish} disabled={busy === 'publish'} className="self-start">
              {busy === 'publish' ? <Loader2 className="size-4 animate-spin" aria-hidden /> : T.publish.button}
            </Button>
          </Stack>
        </Card>
      )}
      {draw.status === 'published' && draw.published_at && (
        <FormNotice tone="success">{T.publish.published(formatDate(draw.published_at)!)}</FormNotice>
      )}

      {(tiers.length > 0 || draw.status === 'published') && (
        <Card>
          <Stack gap="sm">
            <h2 className="type-h4 text-fg">{T.winners.title}</h2>
            {winners.preview && <p className="type-small text-fg-muted">{T.winners.previewNote}</p>}
            <Table>
              <Thead>
                <Tr>
                  <Th>{T.winners.columns.member}</Th>
                  <Th>{T.winners.columns.matches}</Th>
                  <Th>{T.winners.columns.prize}</Th>
                </Tr>
              </Thead>
              <Tbody>
                {winners.rows.length === 0 ? (
                  <EmptyRow colSpan={3}>{T.winners.empty}</EmptyRow>
                ) : (
                  winners.rows.map((row, i) => {
                    const isWinnerRow = 'prize_cents' in row;
                    return (
                      <Tr key={isWinnerRow ? row.id : `${row.user_id}-${i}`}>
                        <Td>{row.profile?.full_name || row.profile?.email || '—'}</Td>
                        <Td>
                          <Badge variant="accent">{isWinnerRow ? `${row.tier}-match` : `${row.match_count}-match`}</Badge>
                        </Td>
                        <Td className="type-num">{isWinnerRow ? formatMoney(row.prize_cents) : '—'}</Td>
                      </Tr>
                    );
                  })
                )}
              </Tbody>
            </Table>
          </Stack>
        </Card>
      )}
    </Stack>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="type-small text-fg-muted">{label}</span>
      <span className="type-num text-fg">{value}</span>
    </div>
  );
}
