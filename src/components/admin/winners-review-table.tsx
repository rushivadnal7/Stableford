'use client';

import { ExternalLink, Loader2 } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormNotice, TextInput } from '@/components/ui/field';
import { Stack } from '@/components/ui/layout';
import { Badge } from '@/components/ui/surface';
import { EmptyRow, Table, Tbody, Td, Th, Thead, Tr } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { ADMIN_WINNERS } from '@/content/admin';
import { apiPost, ApiClientError } from '@/lib/api-client';
import { formatMoney } from '@/lib/format';

const T = ADMIN_WINNERS;

export interface WinnerRow {
  id: string;
  tier: 3 | 4 | 5;
  prize_cents: number;
  verification_status: 'awaiting_proof' | 'submitted' | 'approved' | 'rejected';
  payout_status: 'pending' | 'paid';
  proof_url: string | null;
  review_note: string | null;
  profile: { email: string; full_name: string } | null;
  draw: { period: string } | null;
}

const VERIFICATION_TONE: Record<WinnerRow['verification_status'], 'neutral' | 'accent'> = {
  awaiting_proof: 'neutral',
  submitted: 'accent',
  approved: 'accent',
  rejected: 'neutral',
};

function RejectForm({ onSubmit, busy }: { onSubmit: (note: string) => void; busy: boolean }) {
  const id = useId();
  const [note, setNote] = useState('');
  return (
    <div className="mt-2 flex items-center gap-2">
      <TextInput id={id} placeholder={T.rejectReasonLabel} value={note} onChange={(e) => setNote(e.target.value)} className="h-9 text-sm" />
      <Button type="button" size="sm" variant="secondary" disabled={busy || note.trim().length < 3} onClick={() => onSubmit(note)}>
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : T.reject}
      </Button>
    </div>
  );
}

export function WinnersReviewTable({ winners: initial }: { winners: WinnerRow[] }) {
  const toast = useToast();
  const [winners, setWinners] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function review(id: string, decision: 'approve' | 'reject', note?: string) {
    setBusyId(id);
    setError(null);
    try {
      const { winner } = await apiPost<{ winner: WinnerRow }>(`/api/admin/winners/${id}/review`, { decision, note });
      setWinners((list) => list.map((w) => (w.id === id ? { ...w, ...winner } : w)));
      setRejectingId(null);
      toast({ title: decision === 'approve' ? 'Winner approved.' : 'Winner rejected.', tone: 'success' });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not update that review.');
    } finally {
      setBusyId(null);
    }
  }

  async function pay(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const { winner } = await apiPost<{ winner: WinnerRow }>(`/api/admin/winners/${id}/pay`);
      setWinners((list) => list.map((w) => (w.id === id ? { ...w, ...winner } : w)));
      toast({ title: 'Marked as paid.', tone: 'success' });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not mark that as paid.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Stack gap="md">
      {error && <FormNotice>{error}</FormNotice>}
      <Table>
        <Thead>
          <Tr>
            <Th>{T.columns.member}</Th>
            <Th>{T.columns.period}</Th>
            <Th>{T.columns.tier}</Th>
            <Th>{T.columns.prize}</Th>
            <Th>{T.columns.proof}</Th>
            <Th>{T.columns.verification}</Th>
            <Th>{T.columns.payout}</Th>
          </Tr>
        </Thead>
        <Tbody>
          {winners.length === 0 ? (
            <EmptyRow colSpan={7}>{T.empty}</EmptyRow>
          ) : (
            winners.map((w) => (
              <Tr key={w.id}>
                <Td>{w.profile?.full_name || w.profile?.email || '—'}</Td>
                <Td className="text-fg-muted">{w.draw?.period ?? '—'}</Td>
                <Td>{w.tier}-match</Td>
                <Td className="type-num">{formatMoney(w.prize_cents)}</Td>
                <Td>
                  {w.proof_url ? (
                    <a href={w.proof_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent-text underline-offset-4 hover:underline">
                      {T.viewProof}
                      <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                  ) : (
                    <span className="text-fg-muted">{T.noProof}</span>
                  )}
                </Td>
                <Td>
                  <Badge variant={VERIFICATION_TONE[w.verification_status]}>{w.verification_status}</Badge>
                  {w.verification_status === 'submitted' && (
                    <div className="mt-2 flex flex-col gap-2">
                      <Button type="button" size="sm" onClick={() => review(w.id, 'approve')} disabled={busyId === w.id}>
                        {busyId === w.id ? <Loader2 className="size-4 animate-spin" aria-hidden /> : T.approve}
                      </Button>
                      {rejectingId === w.id ? (
                        <RejectForm busy={busyId === w.id} onSubmit={(note) => review(w.id, 'reject', note)} />
                      ) : (
                        <Button type="button" size="sm" variant="ghost" onClick={() => setRejectingId(w.id)}>
                          {T.reject}
                        </Button>
                      )}
                    </div>
                  )}
                  {w.verification_status === 'rejected' && w.review_note && <p className="type-caption mt-1 text-danger">{w.review_note}</p>}
                </Td>
                <Td>
                  <Badge variant={w.payout_status === 'paid' ? 'accent' : 'neutral'}>{w.payout_status}</Badge>
                  {w.verification_status === 'approved' && w.payout_status === 'pending' && (
                    <Button type="button" size="sm" variant="secondary" className="mt-2" onClick={() => pay(w.id)} disabled={busyId === w.id}>
                      {busyId === w.id ? <Loader2 className="size-4 animate-spin" aria-hidden /> : T.markPaid}
                    </Button>
                  )}
                </Td>
              </Tr>
            ))
          )}
        </Tbody>
      </Table>
    </Stack>
  );
}
