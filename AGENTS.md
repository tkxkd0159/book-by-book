# Repository Guidelines

## Project Structure & Module Organization
This is a Next.js App Router project with TypeScript, NextAuth, PostgreSQL, Vitest, and Playwright.
- `app/`: routes, layouts, loading states, route error UIs, and server actions.
  - `app/(protected)/`: authenticated pages for `/books/*`, `/clubs/*`, and `/me`.
  - `app/api/auth/[...nextauth]/route.ts`: NextAuth handler.
  - `app/api/books/`: server endpoints for Google Books search and import.
  - `app/api/test/`: test-only auth/reset endpoints used by Playwright when `E2E_BYPASS_AUTH=1`.
  - `app/signin/` and `app/auth/error/`: public auth pages.
- `components/`: reusable UI and feature components.
  - `components/auth/`: sign-in and profile controls.
  - `components/books/`: search and import UI.
  - `components/clubs/`: club cards, boards, and book-assignment forms.
  - `components/ui/`: shared primitives (`button`, `input`, `textarea`, `card`, `badge`).
- `lib/`: business and integration logic.
  - `lib/auth/`: NextAuth options, session helpers, user persistence, secrets, and e2e auth helpers.
  - `lib/books/`: Google Books API integration, description/volume normalization, and repository access.
  - `lib/clubs/`: validation, permissions, presentation helpers, repository access, and domain errors.
  - `lib/test/fixtures.ts`: shared test fixtures.
  - `lib/db.ts`: PostgreSQL connection.
- `tests/`: Vitest coverage split into `tests/unit/` and `tests/integration/`.
- `e2e/`: Playwright specs and helpers.
- `db/schema/data.sql`: latest source-of-truth schema snapshot.
- `db/migrations/`: append-only incremental SQL migrations for production rollout.
- `scripts/`: local PostgreSQL setup/cleanup plus local DB availability checks.
- `types/`: shared database and NextAuth type augmentation.
- `docs/`: product/spec work for milestone planning.
- Root config: `next.config.ts`, `proxy.ts`, `vitest.config.ts`, `playwright.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `mise.toml`.

Use the `@/*` TypeScript path alias for internal imports when it improves readability.

## Build, Test, and Development Commands
- `pnpm install`: install dependencies.
- `pnpm dev`: runs `predev` first, which verifies local PostgreSQL reachability when `DATABASE_URL` points at the local dev database.
- `pnpm build`: production build (`next build --webpack`).
- `pnpm start`: runs `prestart` first, with the same local DB reachability check.
- `pnpm lint`: ESLint checks.
- `pnpm test`: Vitest unit suite in `tests/unit`.
- `pnpm test:integration`: Vitest integration suite in `tests/integration`.
- `pnpm test:e2e`: Playwright e2e suite.

Useful filtered e2e runs:
- `pnpm test:e2e --project=chromium`
- `pnpm test:e2e --project="Mobile Safari"`

If you use `mise`, run `mise run dev` to use the pinned toolchain (`node@24`).

## Coding Style & Naming Conventions
- Language: TypeScript (`strict: true`), React 19, Next.js 16, Tailwind 4.
- Indentation: 2 spaces.
- Components: PascalCase; route files follow Next conventions (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `route.ts`).
- Prefer functional components with explicit prop types for reusable components.
- Use server components by default; add `"use client"` only when interactivity or client state is required.
- Keep domain logic in `lib/*` and keep route files focused on composition, request handling, and server actions.
- Reuse `proxy.ts` and shared auth helpers for access control instead of scattering duplicated auth checks.
- Run `pnpm lint` after code changes.

## Testing Guidelines
Use Vitest for domain logic and repository coverage, and Playwright for UI/auth regressions.
- Vitest locations: `tests/unit/*.test.ts`, `tests/integration/*.test.ts`.
- Playwright location: `e2e/*.spec.ts`.
- Current e2e coverage includes book search and club flows.
- For changes in `lib/books/*` or `lib/clubs/*`, run the relevant Vitest suite at minimum.
- For auth, search, or clubs UI changes, run at minimum:
  - `pnpm test:e2e --project=chromium`
- Prefer also running mobile coverage:
  - `pnpm test:e2e --project="Mobile Safari"`

Always treat these as quality gates for substantial changes:
- `pnpm lint`
- `pnpm build`
- `pnpm test`
- `pnpm test:integration`

## Security & Configuration Tips
- Keep secrets in `.env.local`; never commit credentials.
- Required env for the full app flow: `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_BOOKS_API_KEY`, `AUTH_SECRET` (or `NEXTAUTH_SECRET`).
- Set `NEXTAUTH_URL` in runtime environments to avoid NextAuth callback and URL issues.
- `E2E_BYPASS_AUTH=1` is test-only; do not enable it in normal development or production.
- `app/api/test/*` routes are intentionally public only under e2e bypass mode; preserve that constraint.
- Do not edit `.next/`, `node_modules/`, `playwright-report/`, or `test-results/`; these are generated artifacts.

## Database Notes
- `db/schema/data.sql` is the latest source-of-truth schema and should be used directly for fresh DB setup (e2e/local/new environment).
- For any schema, index, or constraint change, add a new sequential migration SQL file in `db/migrations/` for safe production rollout.
- Do not modify or delete existing migration files (for example `db/migrations/1_baseline.sql`).
- Local DB scripts target PostgreSQL 18 Docker images and default to port `54329`:
  - `./scripts/setup-local-postgres.sh`
  - `./scripts/cleanup-local-postgres.sh`
- `scripts/ensure-local-postgres.mjs` is used by `predev` and `prestart` to fail fast when the configured local PostgreSQL instance is not reachable.
