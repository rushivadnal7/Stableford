'use client';

import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FormNotice, TextInput } from '@/components/ui/field';
import { Stack } from '@/components/ui/layout';
import { Card } from '@/components/ui/surface';
import { DASHBOARD } from '@/content/dashboard';
import { apiDelete, apiPatch, apiPost, ApiClientError } from '@/lib/api-client';
import { CONFIG } from '@/lib/config';
import type { Score } from '@/lib/types';

const T = DASHBOARD.scores;

function ScoreForm({
  initial,
  busy,
  error,
  onCancel,
  onSubmit,
}: {
  initial?: Pick<Score, 'score' | 'played_on'>;
  busy: boolean;
  error: string | null;
  onCancel?: () => void;
  onSubmit: (values: { score: number; played_on: string }) => void;
}) {
  const ids = { score: useId(), date: useId() };
  const [score, setScore] = useState(initial?.score ?? CONFIG.score.min);
  const [playedOn, setPlayedOn] = useState(initial?.played_on ?? new Date().toISOString().slice(0, 10));

  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        onSubmit({ score, played_on: playedOn });
      }}
      className="flex flex-col gap-4 rounded-lg border border-line bg-canvas-alt p-card sm:flex-row sm:items-end"
    >
      <Field label={T.scoreLabel} htmlFor={ids.score} className="sm:w-40">
        <TextInput
          id={ids.score}
          type="number"
          min={CONFIG.score.min}
          max={CONFIG.score.max}
          required
          value={score}
          onChange={(e) => setScore(Number(e.target.value))}
        />
      </Field>
      <Field label={T.dateLabel} htmlFor={ids.date} className="flex-1">
        <TextInput id={ids.date} type="date" required max={new Date().toISOString().slice(0, 10)} value={playedOn} onChange={(e) => setPlayedOn(e.target.value)} />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : T.save}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
            {T.cancel}
          </Button>
        )}
      </div>
      {error && (
        <div className="sm:basis-full">
          <FormNotice>{error}</FormNotice>
        </div>
      )}
    </form>
  );
}

/**
 * Also used, with different endpoints, on the admin's per-member page (ADM-02: edit any user's
 * scores). `addUrl`/`itemBaseUrl` point at the admin routes there; a member editing their own
 * history never needs them, so the defaults are the member's own /api/scores. These must stay
 * plain strings (not functions) — this page is rendered from a Server Component, and React can't
 * serialize a function across that boundary.
 */
export function ScoresPanel({
  scores: initialScores,
  canEdit,
  addUrl = '/api/scores',
  itemBaseUrl = '/api/scores',
  title = T.title,
  lead = T.lead,
  showSubscriberNotice = true,
}: {
  scores: Score[];
  canEdit: boolean;
  addUrl?: string;
  itemBaseUrl?: string;
  title?: string;
  lead?: string;
  showSubscriberNotice?: boolean;
}) {
  const [scores, setScores] = useState(initialScores);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addScore = async (values: { score: number; played_on: string }) => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiPost<{ scores: Score[] }>(addUrl, values);
      setScores(res.scores);
      setAdding(false);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not save that score.');
    } finally {
      setBusy(false);
    }
  };

  const editScore = async (id: string, values: { score: number; played_on: string }) => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiPatch<{ scores: Score[] }>(`${itemBaseUrl}/${id}`, values);
      setScores(res.scores);
      setEditingId(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not save that score.');
    } finally {
      setBusy(false);
    }
  };

  const removeScore = async (id: string) => {
    if (!confirm(T.deleteConfirm)) return;
    setBusy(true);
    try {
      const res = await apiDelete<{ scores: Score[] }>(`${itemBaseUrl}/${id}`);
      setScores(res.scores);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not delete that score.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <Stack gap="lg">
        <div>
          <h2 className="type-h4 text-fg">{title}</h2>
          <p className="type-small mt-1 text-fg-muted">{lead}</p>
        </div>

        {!canEdit && showSubscriberNotice && <FormNotice>{T.subscriberOnly}</FormNotice>}

        {scores.length === 0 ? (
          <p className="type-body text-fg-muted">{T.empty}</p>
        ) : (
          <Stack as="ul" gap="sm">
            {scores.map((s) =>
              editingId === s.id ? (
                <li key={s.id}>
                  <ScoreForm initial={s} busy={busy} error={error} onCancel={() => setEditingId(null)} onSubmit={(v) => editScore(s.id, v)} />
                </li>
              ) : (
                <li key={s.id} className="flex items-center gap-4 rounded-lg border border-line px-4 py-3">
                  <span className="type-num flex size-11 shrink-0 items-center justify-center rounded-pill bg-canvas-alt text-fg">{s.score}</span>
                  <span className="type-body flex-1 text-fg-muted">
                    {new Date(`${s.played_on}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
                  </span>
                  {canEdit && (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        aria-label={`${T.edit} ${s.score}`}
                        onClick={() => setEditingId(s.id)}
                        className="grid size-touch place-items-center rounded-pill text-fg-muted transition-colors motion-base hover:bg-fg/8 hover:text-fg"
                      >
                        <Pencil className="size-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        aria-label={`${T.delete} ${s.score}`}
                        onClick={() => removeScore(s.id)}
                        className="grid size-touch place-items-center rounded-pill text-fg-muted transition-colors motion-base hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </div>
                  )}
                </li>
              ),
            )}
          </Stack>
        )}

        {canEdit &&
          (adding ? (
            <ScoreForm busy={busy} error={editingId ? null : error} onCancel={() => setAdding(false)} onSubmit={addScore} />
          ) : (
            <Button type="button" variant="secondary" onClick={() => setAdding(true)} className="self-start">
              <Plus className="size-4" aria-hidden />
              {T.add}
            </Button>
          ))}
        {!canEdit && error && <FormNotice>{error}</FormNotice>}
      </Stack>
    </Card>
  );
}
