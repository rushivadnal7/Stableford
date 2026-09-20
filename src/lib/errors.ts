import { ZodError } from 'zod';

/** An error the client is allowed to see: stable `code`, human `message`, HTTP `status`. */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (message: string, details?: unknown) => new AppError(400, 'bad_request', message, details);
export const unauthorized = () => new AppError(401, 'unauthorized', 'Sign in to continue.');
export const forbidden = (message = 'You do not have access to this.') => new AppError(403, 'forbidden', message);
export const subscriptionRequired = () =>
  new AppError(402, 'subscription_required', 'An active subscription is required for this.');
export const notFound = (what = 'Resource') => new AppError(404, 'not_found', `${what} not found.`);
export const conflict = (code: string, message: string) => new AppError(409, code, message);
export const unprocessable = (code: string, message: string) => new AppError(422, code, message);

/**
 * Exceptions raised on purpose inside SQL functions and triggers
 * (`raise exception 'draw_not_draft'`). The message is the stable code.
 */
const RAISED: Record<string, [status: number, message: string]> = {
  score_date_in_future: [422, 'A score cannot be dated in the future.'],
  score_older_than_last_five: [422, 'That date is older than your last five scores.'],
  draw_not_found: [404, 'Draw not found.'],
  draw_not_draft: [409, 'This draw is already published.'],
  draw_not_simulated: [409, 'Run a simulation before publishing.'],
  draw_out_of_order: [409, 'A later draw has already been published.'],
  draw_stale_rollover: [409, 'The jackpot rollover changed. Run the simulation again.'],
  draw_is_published: [409, 'A published draw cannot be changed.'],
  draw_pool_mismatch: [422, 'The prize ledger does not add up to the pool.'],
  draw_tier_mismatch: [422, 'The prize ledger does not match the winners found.'],
};

interface DbErrorLike {
  code?: string;
  message: string;
  details?: string | null;
}

/** Translate a Supabase/PostgREST error into an AppError. Unknown errors stay 500 and are logged. */
export function fromDbError(error: DbErrorLike): AppError {
  const raised = RAISED[error.message];
  if (raised) return new AppError(raised[0], error.message, raised[1]);

  switch (error.code) {
    case '23505': {
      // unique_violation. PostgREST puts the constraint name in the message, not in `details`.
      const constraint = error.message.match(/constraint "([^"]+)"/)?.[1];
      if (constraint === 'scores_user_date_key') {
        return conflict('duplicate_score_date', 'You already have a score for that date. Edit or delete it instead.');
      }
      if (constraint === 'draws_period_key') return conflict('draw_period_exists', 'A draw for that month already exists.');
      if (constraint === 'charities_slug_key') return conflict('slug_taken', 'Another charity already uses that slug.');
      return conflict('already_exists', 'That already exists.');
    }
    case '23503': // foreign_key_violation
      return conflict('in_use', 'That is still referenced by other records.');
    case '23514': // check_violation
      return unprocessable('constraint_violation', 'That value is not allowed.');
    case '42501': // insufficient_privilege (RLS)
      return forbidden();
    default:
      console.error('Unhandled database error', error);
      return new AppError(500, 'internal_error', 'Something went wrong.');
  }
}

/** Convert anything thrown inside a route into a JSON error response. */
export function errorResponse(error: unknown): Response {
  if (error instanceof AppError) {
    return Response.json({ error: { code: error.code, message: error.message, details: error.details } }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return Response.json(
      { error: { code: 'validation_failed', message: 'The request is not valid.', details: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) } },
      { status: 400 },
    );
  }
  console.error('Unhandled error', error);
  return Response.json({ error: { code: 'internal_error', message: 'Something went wrong.' } }, { status: 500 });
}
