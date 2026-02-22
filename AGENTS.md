# Repository Guidelines

## Project Structure & Module Organization
This is a Next.js App Router project with TypeScript.
- `app/`: routes, layouts, loading states, route error UIs.
  - `app/(protected)/`: authenticated pages (`/books/*`, `/me`).
  - `app/api/`: server endpoints (`auth`, `books/search`, `books/import`).
- `components/`: reusable UI and feature components.
  - `components/auth/`: sign-in button and profile menu.
  - `components/books/`: search form and import button.
  - `components/ui/`: shared primitives (`button`, `input`, `card`, `badge`).
- `lib/`: business and integration logic.
  - `lib/auth/`: NextAuth options/session/user persistence.
  - `lib/books/`: Google Books integration, normalization, repository.
  - `lib/db.ts`: PostgreSQL connection.
- `db/schema/data.sql`: latest source-of-truth schema snapshot.
- `db/migrations/`: append-only incremental SQL migrations for production rollout.
- `scripts/`: local PostgreSQL Docker setup/cleanup.
- `e2e/`: Playwright tests.
- Root config: `next.config.ts`, `tsconfig.json`, `playwright.config.ts`, `eslint.config.mjs`.

Use the `@/*` TypeScript path alias for internal imports when it improves readability.

## Build, Test, and Development Commands
- `pnpm install`: install dependencies.
- `pnpm dev`: run Next.js dev server.
- `pnpm build`: production build.
- `pnpm start`: run production server.
- `pnpm lint`: ESLint checks.
- `pnpm test:e2e`: Playwright e2e suite.

Useful filtered e2e runs:
- `pnpm test:e2e --project=chromium`
- `pnpm test:e2e --project="Mobile Safari"`

If you use `mise`, run `mise run dev` to use the pinned toolchain (`node@24`).

## Coding Style & Naming Conventions
- Language: TypeScript (`strict: true`), React 19, Next.js 16, Tailwind 4.
- Indentation: 2 spaces.
- Components: PascalCase; route files follow Next conventions (`page.tsx`, `layout.tsx`, `loading.tsx`).
- Prefer functional components with explicit prop types for reusable components.
- Use server components by default; use client components only when interactivity/state is needed.
- Keep search/auth logic in `lib/*`, not route files when possible.
- Run `pnpm lint` after changes.

## Testing Guidelines
Playwright is configured and should be used for UI regressions.
- Location: `e2e/*.spec.ts`.
- Current baseline checks: search layout/toggle/query behavior.
- For search/auth UI changes, run at minimum:
  - `pnpm test:e2e --project=chromium`
- Prefer also running mobile coverage:
  - `pnpm test:e2e --project="Mobile Safari"`

Always treat these as quality gates for substantial changes:
- `pnpm lint`
- `pnpm build`

## Security & Configuration Tips
- Keep secrets in `.env.local`; never commit credentials.
- Required env for app: `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_BOOKS_API_KEY`, `AUTH_SECRET` (or `NEXTAUTH_SECRET`).
- Set `NEXTAUTH_URL` in runtime environments to avoid NextAuth URL warnings.
- `E2E_BYPASS_AUTH=1` is test-only (used by Playwright web server).
- Do not edit `.next/` or `node_modules/`; generated artifacts only.

## Database Notes
- `db/schema/data.sql` is the latest source-of-truth schema and should be used directly for fresh DB setup (e2e/local/new environment).
- For any schema/index/constraint change, add a new sequential migration SQL in `db/migrations/` for safe production rollout.
- Do not modify or delete existing migration files (e.g. `db/migrations/1_baseline.sql`).
- Local DB scripts target PostgreSQL 18 Docker images:
  - `./scripts/setup-local-postgres.sh`
  - `./scripts/cleanup-local-postgres.sh`
