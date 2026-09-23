# Stableford

A subscription platform that combines golf score tracking, a monthly prize draw and charity giving.
Built for the Digital Heroes PRD (Level 1).

Subscribers pay monthly or yearly, log their latest five Stableford scores, and are entered into a monthly
draw where their scores are matched against the drawn numbers. Part of every fee goes to a charity they choose.
An admin runs the draws, manages charities and users, and verifies and pays winners.

**Status:** complete end to end — backend (database, business logic, full JSON API, see [API.md](API.md)), and the
web interface: home page, sign-up/sign-in, the member dashboard, the charity directory and the full admin panel
(overview, users, draws, charities, winners). 126 unit tests plus 119 integration tests cover it.

## Stack

Next.js (App Router) and TypeScript on Vercel, Tailwind CSS 4, Supabase (Postgres, Auth, Storage), Stripe, Zod, Vitest.

The backend is the Next.js server code itself (route handlers), not a separate NestJS, Express or Python service.
The custom logic is 34 small routes on top of Supabase, Vercel is serverless, and one codebase in one
language keeps deployment and configuration simple. Business rules live in framework-free modules
(`src/modules`), so they are easy to test and could be moved into a separate service later.

## Try it locally

Requirements: Node 20+ (22 recommended) and Docker.

```bash
npm install
npm run db:start                # local Postgres, Auth and Storage; applies supabase/migrations and seed data
cp .env.example .env.local      # then fill in the values printed by `npx supabase status`
npm run seed:demo               # demo accounts (below)
npm run dev
```

| Account | Password | State |
|---|---|---|
| `admin@stableford.demo` | `Admin#Stableford2026` | administrator |
| `member@stableford.demo` | `Stableford#2026` | active subscriber with five scores |
| `yearly@stableford.demo` | `Stableford#2026` | active yearly subscriber |
| `lapsed@stableford.demo` | `Stableford#2026` | subscription ended: can read history, cannot add scores |
| `newcomer@stableford.demo` | `Stableford#2026` | registered, never subscribed |
| `player1` to `player8@stableford.demo` | `Stableford#2026` | active players, so a simulated draw has a pool |

Sign in through Supabase Auth to get an access token, then call the API (see [API.md](API.md)).

## Demo accounts (hosted project)

These two accounts already exist on the hosted Supabase project this app runs against (not the local `db:start`
stack), pre-confirmed and ready to sign in with, so anyone can try the whole site end to end — public pages, the
member dashboard and the full admin panel — without seeding or configuring anything:

| Account | Email | Password | Access |
|---|---|---|---|
| Admin | `rushikesh.admin@gmail.com` | `Admin@123` | Everything: `/admin` overview, users, draws (simulate and publish), charities, winners review and payout |
| Member | `rushikeshvadnal7+test@gmail.com` | `Stableford#Test1` | Regular subscriber: dashboard, scores, subscription, charity giving |

Sign in at `/login` with either. Point `.env.local` at the hosted project's URL and anon key (not a local
`supabase start`) to use them while running `npm run dev` or `npm run build && npm start`.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` / `typecheck` | ESLint / TypeScript |
| `npm test` | 126 unit tests, no services needed: business rules, prize maths, the theme (contrast, design-token and mobile-first guards) and the hero's scroll choreography |
| `npm run test:integration` | 119 tests against the local Supabase stack: schema rules, RLS, the draw engine, the whole API and a full lifecycle |
| `npm run test:responsive` | After `npm run build`: real Chrome at nine screen widths; fails on sideways scroll, overflow, small tap targets or tiny text |
| `npm run models:optimize` | Compresses the hero's source 3D models (`assets/models-src/`, not committed) into `public/models/` |
| `npm run models:poster` | Renders the hero's still poster images from the same scene code the browser runs |
| `npm run db:start` / `db:stop` / `db:reset` | Local Supabase; `db:reset` re-applies migrations and seed data |
| `npm run seed:demo` | Demo accounts. Add `-- --allow-remote` to seed a hosted project |

The integration tests refuse to run against anything but a local database.

## Environment

Documented in `.env.example` and validated lazily in `src/lib/env.ts`, so a missing Stripe key only breaks the
routes that need Stripe, and `next build` needs no secrets.

| Variable | Notes |
|---|---|
| `APP_URL` | Base URL for Stripe redirects |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project API settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only. Bypasses Row Level Security |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe test mode keys |

## How it works

```
Browser -> Next.js route handlers (validate, authorise) -> src/modules (rules) -> Supabase Postgres, Auth, Storage
                                                                              -> Stripe (Checkout, portal, webhooks)
```

- **The database enforces the rules that must never break:** one score per date, a rolling window of the newest
  five, charity share 10 to 50%, one draw per month, a payout only after an approved proof, a prize ledger that must
  add up to the cent, and published draws that can no longer be changed. Members reach the database with their own
  token, so Row Level Security applies to everything they do.
- **Stripe webhooks are the only writer of subscription state.** The webhook verifies the signature, re-fetches the
  subscription (so stale or out-of-order events cannot regress it) and ignores replays.
- **A draw is a draft that is simulated, then frozen.** Simulating stores everything on the draft and can be repeated;
  publishing makes exactly that result official and creates the winners in one atomic step. Every draw stores its seed,
  so it can be replayed and audited. Bulk work (snapshot, matching) is set-based SQL; number picking and prize maths
  are TypeScript with unit and property tests.
- **Money is integer cents.** Each tier is split equally and rounded down; leftover cents are recorded, and the
  database re-checks that every cent of the pool is a prize, retained, or rolled over.
- **Files never pass through the server.** Proof screenshots and charity images upload straight to Storage with
  short-lived signed URLs (Vercel caps request bodies near 4.5 MB); the proofs bucket is private.

## Design system

Every colour, font, size, weight, space, radius, shadow and motion value comes from one place, `src/styles/`.
Tokens (raw values) feed theme roles (`bg-canvas`, `text-fg`, `bg-action`, per light and dark theme), which feed
named utilities (`type-h2`, `section-y`), which components use. Components contain no raw values, and a test fails if
they do. Any element can switch to the dark theme with `data-theme="dark"`.

- Palette: Bokara Grey, Dark Hunter Green, Lucious Lime, Wet Sand, Whisper White, Bright White.
- Fonts: Instrument Sans (text), Instrument Serif (emphasis and numbers), Geist Mono (labels and scores), via `next/font`.
- Accessibility: `theme.test.ts` evaluates the real CSS and asserts WCAG contrast for every role pair in both themes.
- Motion respects `prefers-reduced-motion`; nothing is hidden if scripts do not run.

See [src/styles/README.md](src/styles/README.md) for how to change a colour, a font, a size or add a role.

The home page reads its plans and charities from the database (rebuilt every five minutes) and falls back to built-in
content if the database is unreachable. All of its copy lives in `src/content/home.ts`.

### The hero's 3D story

The home page opens with a small scroll-driven scene: a bronze golfer statue, a golf bag, a cart and a scan of
a putting green, staged as one continuous shot that plays out as you scroll. It is built to add nothing to the
cost of the first paint:

- **The page is complete without it.** `Hero` (a server component) renders the headline, the buttons and a
  pre-rendered still (`public/models/poster-*.webp`) of the scene's opening frame. `<StoryLoader>` adds the
  motion after the page has loaded and the browser is idle; the layout (the capsule mask, the pinned screen)
  is plain CSS in `src/styles/hero.css`, so nothing shifts when it arrives (Cumulative Layout Shift stays 0).
- **The heavy parts are lazy and small.** three.js, GSAP and the GLTF loader are dynamically imported and never
  part of the first-load bundle. The four models are compressed by `scripts/optimize-models.mjs`
  (`npm run models:optimize`) — meshopt geometry, WebP textures, decimated triangle counts — which shrinks
  ~10 MB of source files to under 900 KB total; only the statue and the green load up front, the bag and cart
  load once the scene is already visible and idle.
- **One number drives everything.** `src/lib/scene/story.ts` is pure, tested maths: a `progress` value from 0
  to 1 maps to a camera shot, where the ball and cart are, and which caption shows. `src/lib/scene/world.ts`
  and `hero-scene.ts` turn that into a three.js scene; `hero-story.ts` reads scroll position from a GSAP
  ScrollTrigger and applies it to both the DOM (clip-path, opacity, transform only — nothing that costs layout)
  and the scene.
- **It steps aside cleanly.** `prefers-reduced-motion`, no WebGL, a slow device (`navigator.deviceMemory`,
  `hardwareConcurrency`, `connection.saveData`) or a load failure all fall back to the plain poster and a static
  list of the same four captions — same content, no motion.
- **Smooth scroll** (Lenis) and **scroll-driven animation** (GSAP ScrollTrigger) are shared across the page,
  loaded the same lazy way, and also skipped under reduced motion or on touch screens (which keep native
  momentum scrolling).

Regenerate the models and posters after changing anything under `src/lib/scene/`:
`npm run models:optimize && npm run models:poster`. Source models and their licences are in
[CREDITS.md](CREDITS.md) — two of the four are non-commercial licences, noted there.

## Assumptions

The PRD leaves some things open. These are the choices made, all adjustable:

1. A draw picks 5 distinct numbers from 1 to 45. A member's entry is the distinct values of their five scores; matching 3, 4 or 5 wins.
2. Eligible: active subscribers holding exactly five scores when the admin simulates. That snapshot is what gets published.
3. Algorithmic mode weights each number by how often it appears across entries, either favouring common or rare numbers (admin's choice).
4. One draw per calendar month (UTC), triggered by the admin.
5. Seed prices: monthly $10, yearly $100, editable in the `plans` table.
6. Each fee splits into 50% prize pool, 10 to 50% charity (the member's choice, default 10%), and the rest to the platform. A yearly plan feeds the pool at one twelfth per month.
7. The pool is the active subscribers' contributions plus any rolled-over jackpot, split 40 / 35 / 25 across the 5, 4 and 3-match tiers. Only the 5-match tier rolls over; unclaimed 4 and 3-match money stays with the platform and is recorded in the ledger.
8. Scores: the newest five by date. Future dates and dates older than the fifth newest are rejected.
9. A lapsed or cancelled member can sign in and read their history but cannot add scores or join draws. Cancelling keeps access until the period ends.
10. A rejected proof can be resubmitted. Verification and payout are separate statuses.
11. An independent donation is a one-off Stripe payment by a signed-in member.
12. Proof screenshots are png, jpg or webp up to 5 MB.
13. Real money movement (paying winners, paying charities) happens outside the app; the admin marks payouts as paid.

## Deploying

Use a **new** Vercel account and a **new** Supabase project.

1. **Supabase:** create a project. Apply the schema: `npx supabase link --project-ref <ref>` then `npx supabase db push`
   (or paste the files in `supabase/migrations` into the SQL editor in order). Optionally run `supabase/seed.sql` for demo charities.
2. **Stripe (test mode):** copy the secret key. Add a webhook endpoint `https://<your-app>/api/webhooks/stripe` for
   `checkout.session.completed` and `customer.subscription.created`, `.updated`, `.deleted`, and copy its signing secret.
   Save the customer portal settings once (Settings, Billing, Customer portal).
3. **Vercel:** import the repository and set the environment variables above (`APP_URL` is the deployed URL).
4. **Demo accounts:** with the hosted project's keys in `.env.local`, run `npm run seed:demo -- --allow-remote`.

## Project layout

```
src/app/api/     thin route handlers: validate, authorise, call a service
src/app/(marketing)/  the public site (home page); more pages share its header and footer
src/modules/     business logic by domain: scores, draws, billing, charities, winners, dashboard, admin, home
src/components/  ui (design-system primitives), layout (header, footer), hero (3D story), motion, home (page sections)
src/content/     the words on the page, kept apart from the components
src/styles/      design tokens, theme roles, named utilities (see its README)
src/lib/         config, env, errors, auth, Supabase and Stripe clients, fonts, routes, scene (the 3D hero), motion
supabase/        migrations (the schema is the source of truth) and seed data
tests/           integration tests, and a real-browser responsive check
scripts/         demo data, 3D model optimisation, poster rendering
assets/          source 3D models before optimisation (not committed; see CREDITS.md)
```

## Branching

Short-lived branches off `main` (`feat/...`, `fix/...`, `chore/...`, `docs/...`), merged with `--no-ff`.
Commits follow Conventional Commits. CI runs lint, type check, unit tests and a build on every pull request.

## Not done yet

- Integration tests in CI (they need a Supabase stack; the recipe is `supabase start` then `npm run test:integration`).
- Email notifications beyond Supabase Auth emails, and scheduled (automatic) draws.
- A custom SMTP sender for Supabase Auth emails — the built-in sender's rate limit is low, so repeated sign-ups
  in quick succession during testing can be throttled. The [demo accounts](#demo-accounts-hosted-project) above are
  pre-confirmed via the Auth admin API specifically to avoid this.
