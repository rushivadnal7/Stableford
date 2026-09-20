import { beforeAll, describe, expect, it } from 'vitest';
import * as charitiesRoute from '@/app/api/charities/route';
import * as charityRoute from '@/app/api/charities/[slug]/route';
import * as dashboardRoute from '@/app/api/me/dashboard/route';
import * as drawRoute from '@/app/api/draws/[id]/route';
import * as drawsRoute from '@/app/api/draws/route';
import * as meRoute from '@/app/api/me/route';
import * as plansRoute from '@/app/api/plans/route';
import * as proofRoute from '@/app/api/winners/[id]/proof/route';
import * as proofUploadRoute from '@/app/api/winners/[id]/proof-upload/route';
import * as scoreRoute from '@/app/api/scores/[id]/route';
import * as scoresRoute from '@/app/api/scores/route';
import { createDraw, publishDraw, simulateDraw } from '@/modules/draws/service';
import { call } from './api';
import { addScores, admin, charityIds, createUser, daysAgo, daysFromNow, resetDb, subscribe } from './helpers';

// A 1x1 PNG.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

beforeAll(resetDb);

describe('public endpoints', () => {
  it('lists the plans', async () => {
    const r = await call(plansRoute.GET, 'GET', '/api/plans');
    expect(r.status).toBe(200);
    expect(r.body.plans.map((p: { code: string; price_cents: number }) => [p.code, p.price_cents])).toEqual([['monthly', 1000], ['yearly', 10000]]);
  });

  it('lists charities with search, category and featured filters', async () => {
    const all = await call(charitiesRoute.GET, 'GET', '/api/charities');
    expect(all.body.total).toBeGreaterThanOrEqual(6);
    expect(all.body.categories).toEqual(expect.arrayContaining(['education', 'environment', 'health']));
    expect(all.body.items[0].is_featured).toBe(true); // featured first

    const search = await call(charitiesRoute.GET, 'GET', '/api/charities?q=beach');
    expect(search.body.items.map((c: { slug: string }) => c.slug)).toEqual(['clean-tide-alliance']);

    const env = await call(charitiesRoute.GET, 'GET', '/api/charities?category=environment');
    expect(env.body.items.map((c: { slug: string }) => c.slug).sort()).toEqual(['clean-tide-alliance', 'green-roots-trust']);

    const featured = await call(charitiesRoute.GET, 'GET', '/api/charities?featured=true');
    expect(featured.body.items).toHaveLength(1);

    const page = await call(charitiesRoute.GET, 'GET', '/api/charities?limit=2&offset=2');
    expect(page.body.items).toHaveLength(2);
    expect(page.body.total).toBeGreaterThanOrEqual(6);
  });

  it('survives awkward search input', async () => {
    const r = await call(charitiesRoute.GET, 'GET', `/api/charities?q=${encodeURIComponent('a,b(c)%*')}`);
    expect(r.status).toBe(200);
  });

  it('rejects a bad query', async () => {
    expect((await call(charitiesRoute.GET, 'GET', '/api/charities?limit=1000')).status).toBe(400);
  });

  it('shows a charity profile with upcoming events, and 404s an unknown one', async () => {
    const r = await call(charityRoute.GET, 'GET', '/api/charities/bright-start-kids', { params: { slug: 'bright-start-kids' } });
    expect(r.status).toBe(200);
    expect(r.body.charity).toMatchObject({ name: 'Bright Start Kids', is_featured: true });
    expect(r.body.charity.events).toHaveLength(1);
    expect(r.body.charity.events[0].title).toBe('Charity Golf Day');

    const missing = await call(charityRoute.GET, 'GET', '/api/charities/nope', { params: { slug: 'nope' } });
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('not_found');
  });
});

describe('authentication', () => {
  it('rejects requests with no token or a bad one', async () => {
    expect((await call(meRoute.GET, 'GET', '/api/me')).status).toBe(401);
    expect((await call(meRoute.GET, 'GET', '/api/me', { token: 'not-a-jwt' })).status).toBe(401);
    expect((await call(scoresRoute.GET, 'GET', '/api/scores')).status).toBe(401);
  });

  it('returns the profile and an inactive subscription for a new user', async () => {
    const u = await createUser('fresh');
    const r = await call(meRoute.GET, 'GET', '/api/me', { token: u.token });
    expect(r.status).toBe(200);
    expect(r.body.profile).toMatchObject({ id: u.id, role: 'member', charity_percent: 10 });
    expect(r.body.subscription).toMatchObject({ active: false, status: 'none' });
  });

  it('updates the profile, validating the charity and percentage', async () => {
    const u = await createUser('editor');
    const [charity] = await charityIds(1);
    const ok = await call(meRoute.PATCH, 'PATCH', '/api/me', { token: u.token, body: { full_name: 'Edith', charity_id: charity, charity_percent: 30 } });
    expect(ok.status).toBe(200);
    expect(ok.body.profile).toMatchObject({ full_name: 'Edith', charity_id: charity, charity_percent: 30 });

    const tooLow = await call(meRoute.PATCH, 'PATCH', '/api/me', { token: u.token, body: { charity_percent: 5 } });
    expect(tooLow.status).toBe(400);
    expect(tooLow.body.error.code).toBe('validation_failed');

    const ghost = await call(meRoute.PATCH, 'PATCH', '/api/me', { token: u.token, body: { charity_id: crypto.randomUUID() } });
    expect(ghost.status).toBe(422);
    expect(ghost.body.error.code).toBe('charity_not_found');

    const empty = await call(meRoute.PATCH, 'PATCH', '/api/me', { token: u.token, body: {} });
    expect(empty.status).toBe(400);

    // The role is not an accepted field and cannot be smuggled in.
    await call(meRoute.PATCH, 'PATCH', '/api/me', { token: u.token, body: { full_name: 'Edith', role: 'admin' } });
    const after = await call(meRoute.GET, 'GET', '/api/me', { token: u.token });
    expect(after.body.profile.role).toBe('member');
  });
});

describe('scores', () => {
  it('requires an active subscription to add, edit or delete', async () => {
    const u = await createUser('unsubscribed');
    const add = await call(scoresRoute.POST, 'POST', '/api/scores', { token: u.token, body: { score: 30, played_on: daysAgo(1) } });
    expect(add.status).toBe(402);
    expect(add.body.error.code).toBe('subscription_required');
    expect((await call(scoreRoute.DELETE, 'DELETE', '/api/scores/x', { token: u.token, params: { id: crypto.randomUUID() } })).status).toBe(402);
  });

  it('adds scores newest first and keeps only five', async () => {
    const u = await createUser('golfer');
    await subscribe(u.id);
    for (let i = 6; i >= 1; i--) {
      const r = await call(scoresRoute.POST, 'POST', '/api/scores', { token: u.token, body: { score: 20 + i, played_on: daysAgo(i * 3) } });
      expect(r.status).toBe(201);
    }
    const list = await call(scoresRoute.GET, 'GET', '/api/scores', { token: u.token });
    expect(list.body.scores).toHaveLength(5);
    expect(list.body.scores.map((s: { played_on: string }) => s.played_on)).toEqual([3, 6, 9, 12, 15].map(daysAgo)); // newest first; 18 days ago was dropped
  });

  it('validates input and reports rule violations clearly', async () => {
    const u = await createUser('careful');
    await subscribe(u.id);
    const post = (body: unknown) => call(scoresRoute.POST, 'POST', '/api/scores', { token: u.token, body });

    expect((await post({ score: 46, played_on: daysAgo(1) })).status).toBe(400);
    expect((await post({ score: 0, played_on: daysAgo(1) })).status).toBe(400);
    expect((await post({ score: 1.5, played_on: daysAgo(1) })).status).toBe(400);
    expect((await post({ score: 20, played_on: 'yesterday' })).status).toBe(400);
    expect((await call(scoresRoute.POST, 'POST', '/api/scores', { token: u.token, rawBody: '{nope' })).body.error.message).toBe('Send a JSON body.');

    const future = await post({ score: 20, played_on: daysFromNow(2) });
    expect(future.status).toBe(422);
    expect(future.body.error.code).toBe('score_date_in_future');

    expect((await post({ score: 20, played_on: daysAgo(2) })).status).toBe(201);
    const dupe = await post({ score: 21, played_on: daysAgo(2) });
    expect(dupe.status).toBe(409);
    expect(dupe.body.error.code).toBe('duplicate_score_date');
  });

  it('edits and deletes only the caller\'s own scores', async () => {
    const owner = await createUser('owner');
    const other = await createUser('other');
    await subscribe(owner.id);
    await subscribe(other.id);
    const created = await call(scoresRoute.POST, 'POST', '/api/scores', { token: owner.token, body: { score: 25, played_on: daysAgo(4) } });
    const id = created.body.score.id as string;

    const edit = await call(scoreRoute.PATCH, 'PATCH', `/api/scores/${id}`, { token: owner.token, params: { id }, body: { score: 33 } });
    expect(edit.status).toBe(200);
    expect(edit.body.score.score).toBe(33);

    // Another member cannot see it, so to them it does not exist.
    expect((await call(scoreRoute.PATCH, 'PATCH', `/api/scores/${id}`, { token: other.token, params: { id }, body: { score: 1 } })).status).toBe(404);
    expect((await call(scoreRoute.DELETE, 'DELETE', `/api/scores/${id}`, { token: other.token, params: { id } })).status).toBe(404);

    const del = await call(scoreRoute.DELETE, 'DELETE', `/api/scores/${id}`, { token: owner.token, params: { id } });
    expect(del.status).toBe(200);
    expect(del.body.scores).toEqual([]);
  });

  it('keeps history readable after the subscription lapses', async () => {
    const u = await createUser('lapsing');
    await subscribe(u.id);
    await addScores(u.id, [[28, daysAgo(3)]]);
    await subscribe(u.id, { status: 'canceled' });
    const list = await call(scoresRoute.GET, 'GET', '/api/scores', { token: u.token });
    expect(list.status).toBe(200);
    expect(list.body.scores).toHaveLength(1);
    expect((await call(scoresRoute.POST, 'POST', '/api/scores', { token: u.token, body: { score: 30, played_on: daysAgo(1) } })).status).toBe(402);
  });
});

describe('dashboard, draws and winning', () => {
  // The prize pool counts every active subscriber, so start from a clean slate.
  beforeAll(resetDb);

  it('shows a member their subscription, scores, charity, participation and winnings', async () => {
    const [charity] = await charityIds(1);
    const boss = await createUser('boss', { role: 'admin' });
    const winner = await createUser('winner');
    const loser = await createUser('loser');
    for (const u of [winner, loser]) await subscribe(u.id, { charityId: charity, charityPercent: 15 });
    await addScores(winner.id, [1, 2, 3, 4, 5].map((s, i) => [s, daysAgo(i + 1)] as [number, string]));
    await addScores(loser.id, [20, 21, 22, 23, 24].map((s, i) => [s, daysAgo(i + 1)] as [number, string]));

    // Before any draw.
    const before = await call(dashboardRoute.GET, 'GET', '/api/me/dashboard', { token: winner.token });
    expect(before.status).toBe(200);
    expect(before.body.subscription).toMatchObject({ active: true, status: 'active' });
    expect(before.body.subscription.plan.code).toBe('monthly');
    expect(before.body.scores).toHaveLength(5);
    expect(before.body.charity.selected.id).toBe(charity);
    expect(before.body.charity.contribution_percent).toBe(15);
    expect(before.body.participation).toMatchObject({ draws_entered: 0, eligible_for_upcoming: true });
    expect(before.body.winnings).toMatchObject({ total_won_cents: 0, items: [] });
    expect((await call(drawsRoute.GET, 'GET', '/api/draws', { token: winner.token })).body.draws).toEqual([]);

    // A draft draw is invisible to members.
    const draw = await createDraw(admin(), boss.id, { period: '2026-10', mode: 'random' });
    await simulateDraw(admin(), boss.id, draw.id, () => ({ seed: 's', numbers: [1, 2, 3, 4, 5] }));
    expect((await call(drawRoute.GET, 'GET', `/api/draws/${draw.id}`, { token: winner.token, params: { id: draw.id } })).status).toBe(404);
    expect((await call(drawsRoute.GET, 'GET', '/api/draws', { token: winner.token })).body.draws).toEqual([]);

    await publishDraw(admin(), boss.id, draw.id);

    // The winner sees the draw, their entry and their prize. The seed is never exposed.
    const detail = await call(drawRoute.GET, 'GET', `/api/draws/${draw.id}`, { token: winner.token, params: { id: draw.id } });
    expect(detail.status).toBe(200);
    expect(detail.body.draw.numbers).toEqual([1, 2, 3, 4, 5]);
    expect(detail.body.draw).not.toHaveProperty('seed');
    expect(detail.body.entry).toMatchObject({ match_count: 5 });
    expect(detail.body.winner).toMatchObject({ tier: 5, verification_status: 'awaiting_proof', payout_status: 'pending' });
    expect(detail.body.tiers).toHaveLength(3);

    // The other member sees the same draw but no win.
    const lost = await call(drawRoute.GET, 'GET', `/api/draws/${draw.id}`, { token: loser.token, params: { id: draw.id } });
    expect(lost.body.entry.match_count).toBe(0);
    expect(lost.body.winner).toBeNull();

    const after = await call(dashboardRoute.GET, 'GET', '/api/me/dashboard', { token: winner.token });
    expect(after.body.participation).toMatchObject({ draws_entered: 1 });
    expect(after.body.participation.recent[0]).toMatchObject({ period: '2026-10', matches: 5 });
    // Two members pay 500 each into the pool (1000); the 5-match tier is 1000 - 350 - 250 = 400.
    expect(after.body.winnings).toMatchObject({ total_won_cents: 400, paid_cents: 0, pending_cents: 400 });
    expect(after.body.winnings.items[0]).toMatchObject({ period: '2026-10', tier: 5, prize_cents: 400, verification_status: 'awaiting_proof' });
  });

  it('runs the proof upload flow, with the checks that protect it', async () => {
    const boss = await createUser('boss2', { role: 'admin' });
    const winner = await createUser('proofer');
    const rival = await createUser('rival');
    await subscribe(winner.id);
    await subscribe(rival.id);
    await addScores(winner.id, [1, 2, 3, 4, 5].map((s, i) => [s, daysAgo(i + 1)] as [number, string]));
    const draw = await createDraw(admin(), boss.id, { period: '2026-11', mode: 'random' });
    await simulateDraw(admin(), boss.id, draw.id, () => ({ seed: 's', numbers: [1, 2, 3, 4, 5] }));
    await publishDraw(admin(), boss.id, draw.id);
    const { data: win } = await admin().from('winners').select('id').eq('user_id', winner.id).single();
    const id = win!.id as string;
    const params = { id };

    // Only the winner can start, and only image files are accepted.
    expect((await call(proofUploadRoute.POST, 'POST', `/api/winners/${id}/proof-upload`, { token: rival.token, params, body: { filename: 'x.png' } })).status).toBe(404);
    expect((await call(proofUploadRoute.POST, 'POST', `/api/winners/${id}/proof-upload`, { token: winner.token, params, body: { filename: 'notes.pdf' } })).status).toBe(400);

    const up = await call(proofUploadRoute.POST, 'POST', `/api/winners/${id}/proof-upload`, { token: winner.token, params, body: { filename: 'scores.PNG' } });
    expect(up.status).toBe(200);
    expect(up.body.path.startsWith(`${winner.id}/${id}/`)).toBe(true);
    expect(up.body.max_bytes).toBe(5 * 1024 * 1024);

    // Submitting before uploading is refused; so is claiming somebody else's path.
    expect((await call(proofRoute.POST, 'POST', `/api/winners/${id}/proof`, { token: winner.token, params, body: { path: up.body.path } })).body.error.code).toBe('proof_not_uploaded');
    expect((await call(proofRoute.POST, 'POST', `/api/winners/${id}/proof`, { token: winner.token, params, body: { path: `${rival.id}/${id}/x.png` } })).status).toBe(403);

    // The bucket itself refuses non-images, whatever the file is called.
    const text = await admin().storage.from('proofs').uploadToSignedUrl(up.body.path, up.body.token, Buffer.from('hello'), { contentType: 'text/plain' });
    expect(text.error).not.toBeNull();

    const upload = await admin().storage.from('proofs').uploadToSignedUrl(up.body.path, up.body.token, PNG, { contentType: 'image/png' });
    expect(upload.error).toBeNull();

    const submit = await call(proofRoute.POST, 'POST', `/api/winners/${id}/proof`, { token: winner.token, params, body: { path: up.body.path } });
    expect(submit.status).toBe(200);
    expect(submit.body.winner).toMatchObject({ verification_status: 'submitted', proof_path: up.body.path });

    // Once submitted, no more uploads until an admin rejects it.
    const again = await call(proofUploadRoute.POST, 'POST', `/api/winners/${id}/proof-upload`, { token: winner.token, params, body: { filename: 'again.png' } });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('proof_not_allowed');

    // The member can read back their own proof, nobody else can.
    expect((await winner.db.storage.from('proofs').download(up.body.path)).error).toBeNull();
    expect((await rival.db.storage.from('proofs').download(up.body.path)).error).not.toBeNull();
  });
});
