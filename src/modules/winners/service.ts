import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { AuthContext } from '@/lib/auth';
import { CONFIG } from '@/lib/config';
import { unwrap, unwrapMaybe } from '@/lib/db';
import { AppError, badRequest, conflict, forbidden, fromDbError, notFound, unprocessable } from '@/lib/errors';
import type { Winner } from '@/lib/types';
import { audit } from '@/modules/audit/service';
import { adminClient } from '@/lib/supabase/admin';

export const proofUploadSchema = z.object({ filename: z.string().trim().min(1).max(200) });
export const submitProofSchema = z.object({ path: z.string().min(1).max(300) });

export const reviewSchema = z
  .object({ decision: z.enum(['approve', 'reject']), note: z.string().trim().max(500).optional() })
  .refine((v) => v.decision === 'approve' || (v.note?.length ?? 0) >= 3, { message: 'Explain why the proof was rejected.', path: ['note'] });

export const winnersListQuery = z.object({
  verification: z.enum(['awaiting_proof', 'submitted', 'approved', 'rejected']).optional(),
  payout: z.enum(['pending', 'paid']).optional(),
  draw_id: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// ---------------------------------------------------------------------------
// Member: upload proof (PRD section 09)
// ---------------------------------------------------------------------------

/**
 * Step 1. Check the winner may upload now, then hand the browser a signed upload URL for a path inside
 * their own folder. The file goes straight to Storage (never through the Next.js server).
 */
export async function requestProofUpload(ctx: AuthContext, winnerId: string, filename: string) {
  const winner = unwrap(await ctx.db.from('winners').select('id, verification_status').eq('id', winnerId).single()) as Pick<Winner, 'id' | 'verification_status'>;
  if (winner.verification_status !== 'awaiting_proof' && winner.verification_status !== 'rejected') {
    throw conflict('proof_not_allowed', 'Proof has already been submitted for this win.');
  }
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (!(CONFIG.proof.extensions as readonly string[]).includes(ext)) {
    throw badRequest(`The screenshot must be ${CONFIG.proof.extensions.join(', ')}.`);
  }

  const path = `${ctx.userId}/${winnerId}/${randomUUID()}.${ext}`;
  const { data, error } = await adminClient().storage.from('proofs').createSignedUploadUrl(path);
  if (error || !data) throw new AppError(502, 'storage_error', 'Could not prepare the upload.');
  return { path, token: data.token, upload_url: data.signedUrl, max_bytes: CONFIG.proof.maxBytes, allowed_extensions: CONFIG.proof.extensions };
}

/** Step 2. After uploading, register the file. Moves the win to "submitted" for the admin to review. */
export async function submitProof(ctx: AuthContext, winnerId: string, path: string) {
  if (!path.startsWith(`${ctx.userId}/${winnerId}/`)) throw forbidden('That file does not belong to this win.');

  const admin = adminClient();
  const folder = `${ctx.userId}/${winnerId}`;
  const name = path.slice(folder.length + 1);
  const { data: files, error } = await admin.storage.from('proofs').list(folder, { search: name });
  if (error) throw new AppError(502, 'storage_error', 'Could not check the upload.');
  if (!files?.some((f) => f.name === name)) throw unprocessable('proof_not_uploaded', 'Upload the file first, then submit it.');

  // Members have no UPDATE right on winners, so this runs as the service role. The filters keep it
  // to their own win, and only while it is still awaiting proof or was rejected.
  const winner = unwrapMaybe(
    await admin
      .from('winners')
      .update({ proof_path: path, verification_status: 'submitted', proof_submitted_at: new Date().toISOString(), reviewed_by: null, reviewed_at: null, review_note: null })
      .eq('id', winnerId)
      .eq('user_id', ctx.userId)
      .in('verification_status', ['awaiting_proof', 'rejected'])
      .select()
      .maybeSingle(),
  ) as Winner | null;
  if (!winner) throw conflict('proof_not_allowed', 'Proof cannot be submitted for this win.');
  return winner;
}

// ---------------------------------------------------------------------------
// Admin: review and payout
// ---------------------------------------------------------------------------

export async function listWinners(admin: SupabaseClient, q: z.output<typeof winnersListQuery>) {
  let query = admin
    .from('winners')
    .select('*, profile:profiles!winners_user_id_fkey(email, full_name), draw:draws(period)', { count: 'exact' });
  if (q.verification) query = query.eq('verification_status', q.verification);
  if (q.payout) query = query.eq('payout_status', q.payout);
  if (q.draw_id) query = query.eq('draw_id', q.draw_id);
  const { data, error, count } = await query.order('created_at', { ascending: false }).range(q.offset, q.offset + q.limit - 1);
  if (error) throw fromDbError(error);

  // Short-lived links so the admin can view each screenshot. Proofs are never public.
  const rows = data as Array<Winner & Record<string, unknown>>;
  const paths = rows.map((r) => r.proof_path).filter((p): p is string => Boolean(p));
  const urls = new Map<string, string>();
  if (paths.length) {
    const signed = await admin.storage.from('proofs').createSignedUrls(paths, CONFIG.signedUrlTtlSeconds);
    for (const s of signed.data ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
  }
  return { items: rows.map((r) => ({ ...r, proof_url: r.proof_path ? (urls.get(r.proof_path) ?? null) : null })), total: count ?? 0 };
}

/** Approve or reject a submitted proof. Only "submitted" can be reviewed. */
export async function reviewWinner(admin: SupabaseClient, actorId: string, id: string, input: z.output<typeof reviewSchema>) {
  const verification_status = input.decision === 'approve' ? 'approved' : 'rejected';
  const winner = unwrapMaybe(
    await admin
      .from('winners')
      .update({ verification_status, reviewed_by: actorId, reviewed_at: new Date().toISOString(), review_note: input.note ?? null })
      .eq('id', id)
      .eq('verification_status', 'submitted')
      .select()
      .maybeSingle(),
  ) as Winner | null;
  if (!winner) throw await notFoundOrConflict(admin, id, 'not_awaiting_review', 'Only a submitted proof can be reviewed.');
  await audit(admin, actorId, `winner.${input.decision}`, 'winner', id, { note: input.note });
  return winner;
}

/** Mark a payout as done. Only an approved, unpaid win can be paid (also enforced by a CHECK). */
export async function markPaid(admin: SupabaseClient, actorId: string, id: string) {
  const winner = unwrapMaybe(
    await admin
      .from('winners')
      .update({ payout_status: 'paid', paid_at: new Date().toISOString(), paid_by: actorId })
      .eq('id', id)
      .eq('verification_status', 'approved')
      .eq('payout_status', 'pending')
      .select()
      .maybeSingle(),
  ) as Winner | null;
  if (!winner) throw await notFoundOrConflict(admin, id, 'cannot_mark_paid', 'Only an approved, unpaid win can be marked as paid.');
  await audit(admin, actorId, 'winner.paid', 'winner', id, { prize_cents: winner.prize_cents });
  return winner;
}

async function notFoundOrConflict(admin: SupabaseClient, id: string, code: string, message: string) {
  const exists = unwrapMaybe(await admin.from('winners').select('id').eq('id', id).maybeSingle());
  return exists ? conflict(code, message) : notFound('Winner');
}
