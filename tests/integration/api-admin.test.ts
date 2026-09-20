import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import * as auditRoute from '@/app/api/admin/audit/route';
import * as chIdRoute from '@/app/api/admin/charities/[id]/route';
import * as chEventsRoute from '@/app/api/admin/charities/[id]/events/route';
import * as chRoute from '@/app/api/admin/charities/route';
import * as drawIdRoute from '@/app/api/admin/draws/[id]/route';
import * as publishRoute from '@/app/api/admin/draws/[id]/publish/route';
import * as simulateRoute from '@/app/api/admin/draws/[id]/simulate/route';
import * as drawsRoute from '@/app/api/admin/draws/route';
import * as eventRoute from '@/app/api/admin/events/[id]/route';
import * as mediaRoute from '@/app/api/admin/media/upload-url/route';
import * as reportsRoute from '@/app/api/admin/reports/route';
import * as adminScoreRoute from '@/app/api/admin/scores/[id]/route';
import * as userScoresRoute from '@/app/api/admin/users/[id]/scores/route';
import * as userSubRoute from '@/app/api/admin/users/[id]/subscription/route';
import * as userRoute from '@/app/api/admin/users/[id]/route';
import * as usersRoute from '@/app/api/admin/users/route';
import * as payRoute from '@/app/api/admin/winners/[id]/pay/route';
import * as reviewRoute from '@/app/api/admin/winners/[id]/review/route';
import * as winnersRoute from '@/app/api/admin/winners/route';
import * as charitiesPublic from '@/app/api/charities/route';
import * as meRoute from '@/app/api/me/route';
import * as scoresRoute from '@/app/api/scores/route';
import * as proofRoute from '@/app/api/winners/[id]/proof/route';
import * as proofUploadRoute from '@/app/api/winners/[id]/proof-upload/route';
import { createDraw, publishDraw, simulateDraw } from '@/modules/draws/service';
import { call } from './api';
import { addScores, admin, charityIds, createUser, daysAgo, daysFromNow, resetDb, subscribe, type TestUser } from './helpers';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const id = () => randomUUID();

let boss: TestUser;
let member: TestUser;
beforeAll(async () => {
  await resetDb();
  boss = await createUser('boss', { role: 'admin' });
  member = await createUser('member');
});

describe('every admin route is admin-only', () => {
  const routes: Array<[string, unknown, string, Record<string, string>?]> = [
    ['GET /users', usersRoute.GET, 'GET'],
    ['GET /users/:id', userRoute.GET, 'GET', { id: id() }],
    ['PATCH /users/:id', userRoute.PATCH, 'PATCH', { id: id() }],
    ['PUT /users/:id/subscription', userSubRoute.PUT, 'PUT', { id: id() }],
    ['GET /users/:id/scores', userScoresRoute.GET, 'GET', { id: id() }],
    ['POST /users/:id/scores', userScoresRoute.POST, 'POST', { id: id() }],
    ['PATCH /scores/:id', adminScoreRoute.PATCH, 'PATCH', { id: id() }],
    ['DELETE /scores/:id', adminScoreRoute.DELETE, 'DELETE', { id: id() }],
    ['GET /charities', chRoute.GET, 'GET'],
    ['POST /charities', chRoute.POST, 'POST'],
    ['PATCH /charities/:id', chIdRoute.PATCH, 'PATCH', { id: id() }],
    ['DELETE /charities/:id', chIdRoute.DELETE, 'DELETE', { id: id() }],
    ['POST /charities/:id/events', chEventsRoute.POST, 'POST', { id: id() }],
    ['PATCH /events/:id', eventRoute.PATCH, 'PATCH', { id: id() }],
    ['DELETE /events/:id', eventRoute.DELETE, 'DELETE', { id: id() }],
    ['POST /media/upload-url', mediaRoute.POST, 'POST'],
    ['GET /draws', drawsRoute.GET, 'GET'],
    ['POST /draws', drawsRoute.POST, 'POST'],
    ['GET /draws/:id', drawIdRoute.GET, 'GET', { id: id() }],
    ['PATCH /draws/:id', drawIdRoute.PATCH, 'PATCH', { id: id() }],
    ['POST /draws/:id/simulate', simulateRoute.POST, 'POST', { id: id() }],
    ['POST /draws/:id/publish', publishRoute.POST, 'POST', { id: id() }],
    ['GET /winners', winnersRoute.GET, 'GET'],
    ['POST /winners/:id/review', reviewRoute.POST, 'POST', { id: id() }],
    ['POST /winners/:id/pay', payRoute.POST, 'POST', { id: id() }],
    ['GET /reports', reportsRoute.GET, 'GET'],
    ['GET /audit', auditRoute.GET, 'GET'],
  ];

  it.each(routes)('%s: 401 with no token, 403 for a member', async (_name, handler, method, params) => {
    expect((await call(handler, method, '/api/admin/x', { params })).status).toBe(401);
    const asMember = await call(handler, method, '/api/admin/x', { token: member.token, params, body: method === 'GET' ? undefined : {} });
    expect(asMember.status).toBe(403);
    expect(asMember.body.error.code).toBe('forbidden');
  });
});

describe('user management', () => {
  it('lists and searches members with their subscription', async () => {
    const target = await createUser('searchable-sam');
    await subscribe(target.id, { plan: 'yearly' });
    const list = await call(usersRoute.GET, 'GET', '/api/admin/users', { token: boss.token });
    expect(list.status).toBe(200);
    expect(list.body.total).toBeGreaterThanOrEqual(3);

    const found = await call(usersRoute.GET, 'GET', '/api/admin/users?q=searchable', { token: boss.token });
    expect(found.body.items).toHaveLength(1);
    expect(found.body.items[0]).toMatchObject({ full_name: 'searchable-sam', subscription: { status: 'active', plan: { code: 'yearly' } } });
  });

  it('shows one member in full', async () => {
    const target = await createUser('detailed');
    await subscribe(target.id);
    await addScores(target.id, [[30, daysAgo(2)]]);
    const r = await call(userRoute.GET, 'GET', `/api/admin/users/${target.id}`, { token: boss.token, params: { id: target.id } });
    expect(r.status).toBe(200);
    expect(r.body.profile.id).toBe(target.id);
    expect(r.body.subscription.status).toBe('active');
    expect(r.body.scores).toHaveLength(1);
    expect(r.body).toHaveProperty('winnings');
    expect((await call(userRoute.GET, 'GET', '/x', { token: boss.token, params: { id: id() } })).status).toBe(404);
  });

  it('edits profile fields and promotes to admin, but will not let an admin demote themselves', async () => {
    const [charity] = await charityIds(1);
    const target = await createUser('promotable');
    const ok = await call(userRoute.PATCH, 'PATCH', '/x', { token: boss.token, params: { id: target.id }, body: { full_name: 'Promoted', charity_id: charity, charity_percent: 40, role: 'admin' } });
    expect(ok.status).toBe(200);
    expect(ok.body.profile).toMatchObject({ full_name: 'Promoted', charity_id: charity, charity_percent: 40, role: 'admin' });

    const self = await call(userRoute.PATCH, 'PATCH', '/x', { token: boss.token, params: { id: boss.id }, body: { role: 'member' } });
    expect(self.status).toBe(409);
    expect(self.body.error.code).toBe('cannot_demote_self');

    expect((await call(userRoute.PATCH, 'PATCH', '/x', { token: boss.token, params: { id: target.id }, body: { charity_percent: 99 } })).status).toBe(400);
    expect((await call(userRoute.PATCH, 'PATCH', '/x', { token: boss.token, params: { id: target.id }, body: { charity_id: id() } })).body.error.code).toBe('charity_not_found');
  });

  it("manually sets a member's subscription, which gives them access immediately", async () => {
    const target = await createUser('comped');
    const before = await call(scoresRoute.POST, 'POST', '/api/scores', { token: target.token, body: { score: 20, played_on: daysAgo(1) } });
    expect(before.status).toBe(402);

    const set = await call(userSubRoute.PUT, 'PUT', '/x', { token: boss.token, params: { id: target.id }, body: { plan_code: 'monthly', status: 'active' } });
    expect(set.status).toBe(200);
    expect(set.body.subscription).toMatchObject({ status: 'active', plan: { code: 'monthly' } });
    expect(new Date(set.body.subscription.current_period_end).getTime()).toBeGreaterThan(Date.now());

    expect((await call(scoresRoute.POST, 'POST', '/api/scores', { token: target.token, body: { score: 20, played_on: daysAgo(1) } })).status).toBe(201);

    await call(userSubRoute.PUT, 'PUT', '/x', { token: boss.token, params: { id: target.id }, body: { plan_code: 'monthly', status: 'canceled' } });
    expect((await call(meRoute.GET, 'GET', '/api/me', { token: target.token })).body.subscription.active).toBe(false);
    expect((await call(userSubRoute.PUT, 'PUT', '/x', { token: boss.token, params: { id: target.id }, body: { plan_code: 'weekly', status: 'active' } })).status).toBe(400);
  });

  it("edits a member's scores on their behalf, under the same rules", async () => {
    const target = await createUser('scored');
    const add = await call(userScoresRoute.POST, 'POST', '/x', { token: boss.token, params: { id: target.id }, body: { score: 18, played_on: daysAgo(3) } });
    expect(add.status).toBe(201);
    const scoreId = add.body.score.id as string;

    const edit = await call(adminScoreRoute.PATCH, 'PATCH', '/x', { token: boss.token, params: { id: scoreId }, body: { score: 27 } });
    expect(edit.body.score.score).toBe(27);

    const future = await call(userScoresRoute.POST, 'POST', '/x', { token: boss.token, params: { id: target.id }, body: { score: 18, played_on: daysFromNow(3) } });
    expect(future.body.error.code).toBe('score_date_in_future');

    const del = await call(adminScoreRoute.DELETE, 'DELETE', '/x', { token: boss.token, params: { id: scoreId } });
    expect(del.status).toBe(200);
    expect((await call(userScoresRoute.GET, 'GET', '/x', { token: boss.token, params: { id: target.id } })).body.scores).toEqual([]);
    expect((await call(adminScoreRoute.DELETE, 'DELETE', '/x', { token: boss.token, params: { id: scoreId } })).status).toBe(404);
  });
});

describe('charity management', () => {
  it('creates, edits, features and lists a charity, and shows it publicly', async () => {
    const created = await call(chRoute.POST, 'POST', '/x', { token: boss.token, body: { slug: 'test-charity', name: 'Test Charity', category: 'testing', summary: 'A test.', is_featured: true } });
    expect(created.status).toBe(201);
    expect(created.body.charity).toMatchObject({ slug: 'test-charity', is_active: true, is_featured: true, image_url: null });
    const cid = created.body.charity.id as string;

    expect((await call(chRoute.POST, 'POST', '/x', { token: boss.token, body: { slug: 'test-charity', name: 'Again' } })).body.error.code).toBe('slug_taken');
    expect((await call(chRoute.POST, 'POST', '/x', { token: boss.token, body: { slug: 'Bad Slug!', name: 'X' } })).status).toBe(400);

    const edit = await call(chIdRoute.PATCH, 'PATCH', '/x', { token: boss.token, params: { id: cid }, body: { name: 'Renamed Charity', image_path: 'charities/pic.png' } });
    expect(edit.body.charity).toMatchObject({ name: 'Renamed Charity', category: 'testing', summary: 'A test.' }); // unsent fields untouched
    expect(edit.body.charity.image_url).toContain('/storage/v1/object/public/charity-media/charities/pic.png');

    const publicList = await call(charitiesPublic.GET, 'GET', '/api/charities?q=renamed');
    expect(publicList.body.items.map((c: { id: string }) => c.id)).toEqual([cid]);
  });

  it('manages events for a charity', async () => {
    const [cid] = await charityIds(1);
    const created = await call(chEventsRoute.POST, 'POST', '/x', { token: boss.token, params: { id: cid }, body: { title: 'Spring Scramble', event_date: daysFromNow(10), location: 'Home Club' } });
    expect(created.status).toBe(201);
    const eid = created.body.event.id as string;

    const edit = await call(eventRoute.PATCH, 'PATCH', '/x', { token: boss.token, params: { id: eid }, body: { title: 'Summer Scramble' } });
    expect(edit.body.event).toMatchObject({ title: 'Summer Scramble', location: 'Home Club' });
    expect((await call(chEventsRoute.POST, 'POST', '/x', { token: boss.token, params: { id: cid }, body: { title: 'No date' } })).status).toBe(400);

    expect((await call(eventRoute.DELETE, 'DELETE', '/x', { token: boss.token, params: { id: eid } })).status).toBe(200);
    expect((await call(eventRoute.DELETE, 'DELETE', '/x', { token: boss.token, params: { id: eid } })).status).toBe(404);
  });

  it('deletes an unused charity but only hides one with history', async () => {
    const make = async (slug: string) => (await call(chRoute.POST, 'POST', '/x', { token: boss.token, body: { slug, name: slug } })).body.charity.id as string;
    const unused = await make('unused-charity');
    const used = await make('used-charity');
    await admin().from('donations').insert({ user_id: member.id, charity_id: used, amount_cents: 1000, stripe_session_id: `cs_${id()}` });

    expect((await call(chIdRoute.DELETE, 'DELETE', '/x', { token: boss.token, params: { id: unused } })).body).toEqual({ deleted: true, deactivated: false });
    expect((await admin().from('charities').select('id').eq('id', unused)).data).toEqual([]);

    expect((await call(chIdRoute.DELETE, 'DELETE', '/x', { token: boss.token, params: { id: used } })).body).toEqual({ deleted: false, deactivated: true });
    expect((await admin().from('charities').select('is_active').eq('id', used).single()).data?.is_active).toBe(false);
    expect((await call(charitiesPublic.GET, 'GET', '/api/charities?q=used-charity')).body.items).toEqual([]);
    expect((await call(chIdRoute.DELETE, 'DELETE', '/x', { token: boss.token, params: { id: id() } })).status).toBe(404);
  });

  it('issues a signed upload URL for image files only', async () => {
    const ok = await call(mediaRoute.POST, 'POST', '/x', { token: boss.token, body: { filename: 'logo.webp' } });
    expect(ok.status).toBe(200);
    expect(ok.body.path).toMatch(/^charities\/.+\.webp$/);
    const upload = await admin().storage.from('charity-media').uploadToSignedUrl(ok.body.path, ok.body.token, PNG, { contentType: 'image/png' });
    expect(upload.error).toBeNull();
    expect((await fetch(ok.body.public_url)).status).toBe(200); // the bucket is public
    expect((await call(mediaRoute.POST, 'POST', '/x', { token: boss.token, body: { filename: 'malware.exe' } })).status).toBe(400);
  });
});

describe('draw administration', () => {
  const create = (body: unknown) => call(drawsRoute.POST, 'POST', '/x', { token: boss.token, body });

  it('validates a new draw and allows one per month', async () => {
    expect((await create({ period: '2026-13' })).status).toBe(400);
    expect((await create({ period: '2029-01', mode: 'algorithmic' })).status).toBe(400); // needs a weighting
    expect((await create({ period: '2029-01', mode: 'random', weighting: 'rare' })).status).toBe(400); // random has none
    expect((await create({ period: '2029-01' })).status).toBe(201);
    const dupe = await create({ period: '2029-01' });
    expect(dupe.status).toBe(409);
    expect(dupe.body.error.code).toBe('draw_period_exists');
  });

  it('simulates with random numbers, changes mode, and refuses to publish an unsimulated draw', async () => {
    const { body } = await create({ period: '2029-02', mode: 'algorithmic', weighting: 'common' });
    const did = body.draw.id as string;
    const params = { id: did };

    const early = await call(publishRoute.POST, 'POST', '/x', { token: boss.token, params });
    expect(early.status).toBe(409);
    expect(early.body.error.code).toBe('draw_not_simulated');

    const sim = await call(simulateRoute.POST, 'POST', '/x', { token: boss.token, params });
    expect(sim.status).toBe(200);
    expect(sim.body.draw.status).toBe('draft');
    expect(new Set(sim.body.draw.numbers).size).toBe(5);
    expect(sim.body.draw.numbers.every((n: number) => n >= 1 && n <= 45)).toBe(true);
    expect(sim.body.tiers).toHaveLength(3);
    expect(sim.body.winners.preview).toBe(true);

    // Changing the mode invalidates the simulation, so it must be run again before publishing.
    const patch = await call(drawIdRoute.PATCH, 'PATCH', '/x', { token: boss.token, params, body: { mode: 'random' } });
    expect(patch.body.draw).toMatchObject({ mode: 'random', weighting: null, numbers: null, simulated_at: null });
    expect((await call(publishRoute.POST, 'POST', '/x', { token: boss.token, params })).body.error.code).toBe('draw_not_simulated');

    await call(simulateRoute.POST, 'POST', '/x', { token: boss.token, params });
    const published = await call(publishRoute.POST, 'POST', '/x', { token: boss.token, params });
    expect(published.status).toBe(200);
    expect(published.body.draw.status).toBe('published');

    // Published is final.
    expect((await call(simulateRoute.POST, 'POST', '/x', { token: boss.token, params })).body.error.code).toBe('draw_not_draft');
    expect((await call(publishRoute.POST, 'POST', '/x', { token: boss.token, params })).body.error.code).toBe('draw_not_draft');
    expect((await call(drawIdRoute.PATCH, 'PATCH', '/x', { token: boss.token, params, body: { mode: 'random' } })).body.error.code).toBe('draw_is_published');

    const list = await call(drawsRoute.GET, 'GET', '/x', { token: boss.token });
    expect(list.body.draws.some((d: { id: string }) => d.id === did)).toBe(true);
    expect((await call(drawIdRoute.GET, 'GET', '/x', { token: boss.token, params })).body.draw.status).toBe('published');
    expect((await call(drawIdRoute.GET, 'GET', '/x', { token: boss.token, params: { id: id() } })).status).toBe(404);
  });
});

describe('winner verification and payout (PRD section 09)', () => {
  /** A published draw with one winner who has already uploaded a proof screenshot. */
  async function winnerWithProof(period: string) {
    const winner = await createUser(`winner-${period}`);
    await subscribe(winner.id);
    await addScores(winner.id, [1, 2, 3, 4, 5].map((s, i) => [s, daysAgo(i + 1)] as [number, string]));
    const draw = await createDraw(admin(), boss.id, { period, mode: 'random' });
    await simulateDraw(admin(), boss.id, draw.id, () => ({ seed: 's', numbers: [1, 2, 3, 4, 5] }));
    await publishDraw(admin(), boss.id, draw.id);
    const { data } = await admin().from('winners').select('id').eq('user_id', winner.id).single();
    const wid = data!.id as string;
    return { winner, wid, upload: () => uploadProof(winner, wid) };
  }

  async function uploadProof(winner: TestUser, wid: string) {
    const params = { id: wid };
    const up = await call(proofUploadRoute.POST, 'POST', '/x', { token: winner.token, params, body: { filename: 'scores.png' } });
    expect(up.status).toBe(200);
    await admin().storage.from('proofs').uploadToSignedUrl(up.body.path, up.body.token, PNG, { contentType: 'image/png' });
    const submit = await call(proofRoute.POST, 'POST', '/x', { token: winner.token, params, body: { path: up.body.path } });
    expect(submit.status).toBe(200);
    return up.body.path as string;
  }

  const review = (wid: string, body: unknown) => call(reviewRoute.POST, 'POST', '/x', { token: boss.token, params: { id: wid }, body });
  const pay = (wid: string) => call(payRoute.POST, 'POST', '/x', { token: boss.token, params: { id: wid } });

  it('reviews, pays, and only in the right order', async () => {
    const { wid, upload } = await winnerWithProof('2030-01');

    // Nothing to review or pay before a proof is submitted.
    expect((await review(wid, { decision: 'approve' })).body.error.code).toBe('not_awaiting_review');
    expect((await pay(wid)).body.error.code).toBe('cannot_mark_paid');

    const path = await upload();
    const queue = await call(winnersRoute.GET, 'GET', '/x?verification=submitted', { token: boss.token });
    const item = queue.body.items.find((w: { id: string }) => w.id === wid);
    expect(item).toMatchObject({ verification_status: 'submitted', payout_status: 'pending', proof_path: path });
    expect(item.profile.email).toContain('@test.local');
    expect(item.draw.period).toBe('2030-01');
    expect((await fetch(item.proof_url)).status).toBe(200); // the admin can open the screenshot

    expect((await pay(wid)).body.error.code).toBe('cannot_mark_paid'); // submitted, not yet approved
    expect((await review(wid, { decision: 'approve' })).body.winner).toMatchObject({ verification_status: 'approved', reviewed_by: boss.id });
    expect((await review(wid, { decision: 'reject', note: 'too late' })).body.error.code).toBe('not_awaiting_review');

    const paid = await pay(wid);
    expect(paid.body.winner).toMatchObject({ payout_status: 'paid', paid_by: boss.id });
    expect(paid.body.winner.paid_at).toBeTruthy();
    expect((await pay(wid)).body.error.code).toBe('cannot_mark_paid'); // not twice

    const paidList = await call(winnersRoute.GET, 'GET', '/x?payout=paid', { token: boss.token });
    expect(paidList.body.items.some((w: { id: string }) => w.id === wid)).toBe(true);
  });

  it('lets a rejected winner resubmit', async () => {
    const { winner, wid, upload } = await winnerWithProof('2030-02');
    await upload();

    expect((await review(wid, { decision: 'reject' })).status).toBe(400); // a reason is required
    expect((await review(wid, { decision: 'reject', note: 'ok' })).status).toBe(400); // too short to be a reason
    const rejected = await review(wid, { decision: 'reject', note: 'The screenshot is cropped' });
    expect(rejected.body.winner).toMatchObject({ verification_status: 'rejected', review_note: 'The screenshot is cropped' });
    expect((await pay(wid)).body.error.code).toBe('cannot_mark_paid');

    // The member sees why, and can try again.
    const wins = await winner.db.from('winners').select('verification_status, review_note').eq('id', wid).single();
    expect(wins.data).toMatchObject({ verification_status: 'rejected', review_note: 'The screenshot is cropped' });
    await upload();
    const resubmitted = await admin().from('winners').select('verification_status, review_note, reviewed_by').eq('id', wid).single();
    expect(resubmitted.data).toMatchObject({ verification_status: 'submitted', review_note: null, reviewed_by: null });

    expect((await review(wid, { decision: 'approve' })).body.winner.verification_status).toBe('approved');
    expect((await pay(wid)).status).toBe(200);
  });

  it('answers 404 for a winner that does not exist', async () => {
    expect((await review(id(), { decision: 'approve' })).status).toBe(404);
    expect((await pay(id())).status).toBe(404);
  });
});

describe('reports and audit log', () => {
  it('reports users, prize pool, charity totals and draw statistics', async () => {
    const r = await call(reportsRoute.GET, 'GET', '/x', { token: boss.token });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ draws_published: expect.any(Number), total_users: expect.any(Number), paid_out_cents: expect.any(Number) });
    expect(r.body.total_users).toBeGreaterThan(5);
    expect(r.body.draws_published).toBeGreaterThanOrEqual(3);
    expect(r.body.paid_out_cents).toBeGreaterThan(0);
    expect(Array.isArray(r.body.charity_totals)).toBe(true);
    expect(r.body.draw_stats[0]).toHaveProperty('period');
  });

  it('records what admins did', async () => {
    const r = await call(auditRoute.GET, 'GET', '/x?limit=200', { token: boss.token });
    const actions = new Set(r.body.entries.map((e: { action: string }) => e.action));
    for (const a of ['draw.create', 'draw.simulate', 'draw.publish', 'winner.approve', 'winner.reject', 'winner.paid', 'user.update', 'subscription.override', 'charity.create', 'score.add']) {
      expect(actions, `missing audit action ${a}`).toContain(a);
    }
    expect(r.body.entries[0].actor.email).toContain('@test.local');
    expect((await call(auditRoute.GET, 'GET', '/x?limit=0', { token: boss.token })).status).toBe(400);
  });
});
