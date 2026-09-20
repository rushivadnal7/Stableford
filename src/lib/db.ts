import { fromDbError, notFound } from '@/lib/errors';

interface DbResult<T> {
  data: T | null;
  error: { code?: string; message: string; details?: string | null } | null;
}

/** Return `data`, or throw an AppError for the client. Use for reads and writes that must succeed. */
export function unwrap<T>(result: DbResult<T>): T {
  if (result.error) {
    // PostgREST reports "no rows" for .single() as PGRST116.
    if (result.error.code === 'PGRST116') throw notFound();
    throw fromDbError(result.error);
  }
  return result.data as T;
}

/** Like unwrap, for queries that may legitimately return nothing (maybeSingle). */
export function unwrapMaybe<T>(result: DbResult<T>): T | null {
  if (result.error) throw fromDbError(result.error);
  return result.data;
}

/** Escape user text for a PostgREST `ilike` inside `.or()`: drop characters that break the filter grammar. */
export function likePattern(text: string): string {
  return `%${text.replace(/[%,()*\\]/g, ' ').trim()}%`;
}
