import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { AppError, errorResponse, fromDbError } from './errors';

describe('fromDbError', () => {
  it('maps deliberate SQL exceptions to their HTTP status', () => {
    expect(fromDbError({ code: 'P0001', message: 'score_date_in_future' })).toMatchObject({ status: 422, code: 'score_date_in_future' });
    expect(fromDbError({ code: 'P0001', message: 'draw_not_draft' })).toMatchObject({ status: 409, code: 'draw_not_draft' });
    expect(fromDbError({ code: 'P0001', message: 'draw_not_found' })).toMatchObject({ status: 404 });
  });

  it('maps unique violations by constraint name', () => {
    const dup = (constraint: string) => fromDbError({ code: '23505', message: `duplicate key value violates unique constraint "${constraint}"` });
    expect(dup('scores_user_date_key')).toMatchObject({ status: 409, code: 'duplicate_score_date' });
    expect(dup('draws_period_key')).toMatchObject({ status: 409, code: 'draw_period_exists' });
    expect(dup('something_else')).toMatchObject({ status: 409, code: 'already_exists' });
  });

  it('maps privilege, check and foreign-key violations', () => {
    expect(fromDbError({ code: '42501', message: 'nope' })).toMatchObject({ status: 403 });
    expect(fromDbError({ code: '23514', message: 'check' })).toMatchObject({ status: 422 });
    expect(fromDbError({ code: '23503', message: 'fk' })).toMatchObject({ status: 409, code: 'in_use' });
  });

  it('hides unknown database errors behind a 500', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = fromDbError({ code: 'XX000', message: 'secret internal detail' });
    expect(err.status).toBe(500);
    expect(err.message).not.toContain('secret');
    spy.mockRestore();
  });
});

describe('errorResponse', () => {
  it('serialises an AppError', async () => {
    const res = errorResponse(new AppError(418, 'teapot', 'I am a teapot'));
    expect(res.status).toBe(418);
    expect(await res.json()).toEqual({ error: { code: 'teapot', message: 'I am a teapot' } });
  });

  it('turns validation failures into a 400 with field paths', async () => {
    const parsed = z.object({ score: z.number().min(1) }).safeParse({ score: 0 });
    const res = errorResponse(parsed.error);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('validation_failed');
    expect(body.error.details[0].path).toBe('score');
  });

  it('never leaks the message of an unexpected error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = errorResponse(new Error('db password is hunter2'));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('hunter2');
    spy.mockRestore();
  });
});
