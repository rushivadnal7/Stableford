'use client';

import { Loader2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Badge, Card } from '@/components/ui/surface';
import { FormNotice } from '@/components/ui/field';
import { Stack } from '@/components/ui/layout';
import { DASHBOARD } from '@/content/dashboard';
import { apiPost, ApiClientError } from '@/lib/api-client';
import { CONFIG } from '@/lib/config';
import { formatMoney } from '@/lib/format';
import { browserClient } from '@/lib/supabase/browser';

const T = DASHBOARD.winnings;

export interface WinningItem {
  id: string;
  period: string | null;
  tier: 3 | 4 | 5;
  prize_cents: number;
  verification_status: keyof typeof T.verification;
  payout_status: keyof typeof T.payout;
  review_note: string | null;
}

const VERIFICATION_TONE: Record<WinningItem['verification_status'], 'neutral' | 'accent'> = {
  awaiting_proof: 'neutral',
  submitted: 'accent',
  approved: 'accent',
  rejected: 'neutral',
};

function ProofUpload({ winnerId, onSubmitted }: { winnerId: string; onSubmitted: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File) {
    setError(null);
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!(CONFIG.proof.extensions as readonly string[]).includes(ext)) {
      setError(`The screenshot must be ${CONFIG.proof.extensions.join(', ')}.`);
      return;
    }
    if (file.size > CONFIG.proof.maxBytes) {
      setError('That file is too large (max 5 MB).');
      return;
    }
    setBusy(true);
    try {
      const { path, token } = await apiPost<{ path: string; token: string }>(`/api/winners/${winnerId}/proof-upload`, { filename: file.name });
      const { error: uploadError } = await browserClient().storage.from('proofs').uploadToSignedUrl(path, token, file);
      if (uploadError) throw uploadError;
      await apiPost(`/api/winners/${winnerId}/proof`, { path });
      onSubmitted();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : err instanceof Error ? err.message : 'Could not upload that file.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={CONFIG.proof.extensions.map((e) => `.${e}`).join(',')}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onFile(file);
        }}
        className="hidden"
        id={`proof-${winnerId}`}
      />
      <label
        htmlFor={`proof-${winnerId}`}
        className="inline-flex min-h-touch w-fit cursor-pointer items-center gap-2 rounded-pill border border-line-strong px-4 type-label text-fg transition-colors motion-base hover:border-fg"
      >
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />}
        {busy ? T.uploading : T.uploadProof}
      </label>
      {error && <FormNotice>{error}</FormNotice>}
    </div>
  );
}

export function WinningsPanel({ items: initialItems, totalCents, paidCents, pendingCents }: { items: WinningItem[]; totalCents: number; paidCents: number; pendingCents: number }) {
  const [items, setItems] = useState(initialItems);

  return (
    <Card>
      <Stack gap="lg">
        <div>
          <h2 className="type-h4 text-fg">{T.title}</h2>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="type-caption text-fg-muted">{T.total}</p>
            <p className="type-num mt-1 text-lg text-fg">{formatMoney(totalCents)}</p>
          </div>
          <div>
            <p className="type-caption text-fg-muted">{T.paid}</p>
            <p className="type-num mt-1 text-lg text-fg">{formatMoney(paidCents)}</p>
          </div>
          <div>
            <p className="type-caption text-fg-muted">{T.pending}</p>
            <p className="type-num mt-1 text-lg text-fg">{formatMoney(pendingCents)}</p>
          </div>
        </div>

        {items.length === 0 ? (
          <p className="type-body text-fg-muted">{T.none}</p>
        ) : (
          <Stack as="ul" gap="sm">
            {items.map((w) => {
              const needsProof = w.verification_status === 'awaiting_proof' || w.verification_status === 'rejected';
              return (
                <li key={w.id} className="flex flex-col gap-3 rounded-lg border border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="type-label text-fg">
                      {T.tier(w.tier)} {w.period ? `· ${w.period}` : ''}
                    </p>
                    <p className="type-num mt-0.5 text-fg-muted">{formatMoney(w.prize_cents)}</p>
                    {w.verification_status === 'rejected' && w.review_note && <p className="type-small mt-1 text-danger">{w.review_note}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={VERIFICATION_TONE[w.verification_status]}>{T.verification[w.verification_status]}</Badge>
                    <Badge variant="neutral">{T.payout[w.payout_status]}</Badge>
                    {needsProof && (
                      <ProofUpload
                        winnerId={w.id}
                        onSubmitted={() => setItems((list) => list.map((i) => (i.id === w.id ? { ...i, verification_status: 'submitted' } : i)))}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </Stack>
        )}
      </Stack>
    </Card>
  );
}
