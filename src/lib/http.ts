import type { z } from 'zod';
import { badRequest, errorResponse } from '@/lib/errors';

type Awaitable<T> = T | Promise<T>;

/**
 * Wrap a route handler: run it, turn the returned object into JSON, and turn anything thrown
 * (AppError, ZodError, database errors) into a consistent JSON error response.
 * Route params are awaited for the handler, as Next.js passes them as a Promise.
 */
export function api<P extends Record<string, string> = Record<string, never>>(
  handler: (req: Request, ctx: { params: P }) => Awaitable<Response | object | null | void>,
) {
  return async (req: Request, ctx: { params: Promise<P> }): Promise<Response> => {
    try {
      const out = await handler(req, { params: await ctx.params });
      if (out instanceof Response) return out;
      return Response.json(out ?? { ok: true });
    } catch (error) {
      return errorResponse(error);
    }
  };
}

/** Parse and validate a JSON body. */
export async function readBody<T extends z.ZodType>(req: Request, schema: T): Promise<z.output<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw badRequest('Send a JSON body.');
  }
  return schema.parse(raw);
}

/** Parse and validate the query string. */
export function readQuery<T extends z.ZodType>(req: Request, schema: T): z.output<T> {
  return schema.parse(Object.fromEntries(new URL(req.url).searchParams));
}
