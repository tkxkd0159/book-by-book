# Repository Guidelines

## Project Structure & Module Organization
This is a Next.js App Router project with TypeScript.
- `app/`: route UI, route-level error boundaries, and global styles (`layout.tsx`, `page.tsx`, `error.tsx`, `globals.css`).
- `components/`: reusable UI components (for example, shared fallback UIs).
- `lib/`: shared runtime utilities (for example, `lib/db.ts` for PostgreSQL connection).
- `public/`: static assets (SVGs, icons).
- `db/schema/`: SQL schema for database setup.
- Root config: `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `mise.toml`.

Use the `@/*` TypeScript path alias for internal imports when it improves readability.

## Build, Test, and Development Commands
- `pnpm install`: install dependencies.
- `pnpm dev`: run local dev server (Next.js).
- `pnpm build`: create production build.
- `pnpm start`: run the production server.
- `pnpm lint`: run ESLint with Next.js + TypeScript rules.

If you use `mise`, run `mise run dev` to install dependencies (if needed) and start development with the pinned toolchain (`node@24`).

## Coding Style & Naming Conventions
- Language: TypeScript (`strict: true`), React 19, Next.js 16, Tailwind 4.
- Indentation: 2 spaces; keep files formatted consistently with existing code.
- Components: PascalCase for component names; route files follow Next conventions (`page.tsx`, `layout.tsx`).
- Error handling: prefer App Router boundaries (`app/error.tsx`) for reusable fallback UX instead of page-local JSX in `try/catch`.
- Variables/functions: camelCase.
- Prefer functional components and explicit props typing for reusable components.
- Run `pnpm lint` after make a change.

## Testing Guidelines
There is no test framework configured yet. For now:
- Treat `pnpm lint` and `pnpm build` as required quality gates.
- For new features, add tests with your chosen framework (recommended: Vitest + Testing Library for unit/component tests, Playwright for e2e).
- Name tests `*.test.ts` or `*.test.tsx`, colocated with the related module or under a future `tests/` directory.

## Security & Configuration Tips
- Keep secrets in `.env.local`; never commit env files with credentials.
- Do not edit `.next/` or `node_modules/`; they are generated artifacts.
