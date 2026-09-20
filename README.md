# Stableford

A subscription platform that combines golf score tracking, a monthly prize draw and charity giving.
Built for the Digital Heroes PRD (Level 1).

**Status:** phase 1 (backend, database and API). The interface is built in phase 2.

## Stack

Next.js (App Router) and TypeScript on Vercel, Supabase (Postgres, Auth, Storage), Stripe, Zod, Vitest.
Why this stack and not a separate NestJS/Express/Python service: see the decision notes in the project docs.

## Getting started

Requirements: Node 20+, Docker (for the local Supabase stack).

```bash
npm install
cp .env.example .env.local     # then fill in the values (see below)
npm run db:start               # local Postgres + Auth + Storage; applies supabase/migrations
npm run dev
```

| Script | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` / `typecheck` | ESLint / TypeScript |
| `npm test` | Unit tests (no services needed) |
| `npm run test:integration` | Database and API tests against the local Supabase stack |
| `npm run db:start` / `db:stop` / `db:reset` | Local Supabase; `db:reset` re-applies migrations and seed data |
| `npm run seed:demo` | Creates demo accounts (admin, active subscriber, lapsed subscriber) |

## Environment

All variables are documented in `.env.example` and validated lazily in `src/lib/env.ts`.
`npx supabase status` prints the local URL and keys.

## Project layout

```
src/app/api/     thin route handlers: validate, authorise, call a service
src/modules/     business logic by domain (scores, draws, billing, charities, winners, ...)
src/lib/         config, env, errors, auth, Supabase and Stripe clients
supabase/        migrations (the schema is the source of truth) and seed data
tests/           integration tests
```

## Branching

Short-lived branches off `main` (`feat/...`, `fix/...`, `chore/...`, `docs/...`), merged with `--no-ff`.
Commits follow Conventional Commits. CI runs lint, type check, tests and a build on every pull request.
