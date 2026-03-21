# Milestone 6: Shadcn UI Modernization

## Summary

- Use the existing repo convention and create this under `docs/tasks/milestone-6/`, not a new top-level `tasks/` directory.
- Milestone 6 should be framed as a design-system and surface-migration milestone, not a product-feature milestone.
- Preserve current routes, server actions, schema, and core behaviors from Milestones 1 through 5 while replacing the custom UI foundation with shadcn-based primitives and more consistent responsive layouts.

## Milestone Doc

- Create `docs/tasks/milestone-6/milestone-6-shadcn-ui-modernization.md`.
- Goal: modernize the full app UI on top of the existing books, clubs, threads, shelves, reviews, and beta-onboarding foundation by adopting shadcn primitives, shared semantic tokens, and consistent desktop/mobile patterns.
- Current Baseline: the app already has custom `components/ui/*`, a warm theme in `app/globals.css`, custom modal/dropdown/tab/toast logic, and a spec that already calls for shadcn primitives.
- Planning Assumptions:
  - keep the warm editorial direction
  - use official shadcn/Radix primitives for interactions
  - preserve URLs and existing data flows
  - use desktop top nav plus mobile bottom nav
  - use Dialog on desktop and Drawer on mobile for long interactive flows
- Delivery Order:
  1. Task 01: Shadcn Foundation and Theme Tokens
  2. Task 02: App Shell Navigation and Shared Layout Patterns
  3. Task 03: Public Auth and Book Discovery Surface Refresh
  4. Task 04: Clubs Threads Shelves Profile and Review Surface Migration
  5. Task 05: Quality Gates and Regression Coverage
- Milestone Exit Criteria:
  - all major surfaces use the new shared design system
  - custom modal/dropdown/tab/toast implementations are removed or reduced to thin wrappers
  - desktop and mobile flows remain reachable and accessible
  - `pnpm lint`, `pnpm build`, `pnpm test`, `pnpm test:integration`, and required Playwright runs pass

## Task Docs

- `task-01-shadcn-foundation-and-theme-tokens.md`: install and configure shadcn for the current Next.js and Tailwind v4 app; add `components.json`; add supporting deps such as Radix packages, `class-variance-authority`, `clsx`, `tailwind-merge`, and `sonner`; update `lib/utils.ts` to standard `cn()` behavior; rebuild global semantic tokens and fonts around a warm editorial palette; add or migrate shared primitives such as Button, Card, Badge, Input, Textarea, Avatar, Separator, Skeleton, Tabs, Dialog, Drawer, DropdownMenu, Sheet, Switch, and toast. Acceptance: the app has a stable shadcn-ready design foundation without changing product behavior.
- `task-02-app-shell-navigation-and-shared-layout-patterns.md`: redesign shared app chrome and layout helpers used across the protected app; modernize `app/(protected)/layout.tsx`; replace the custom profile menu with DropdownMenu; replace flash toast handling with sonner; add consistent page-header, section-header, empty-state, and shared card patterns; introduce mobile bottom navigation and clearer active desktop nav states. Acceptance: all protected pages share one consistent shell and common structural primitives.
- `task-03-public-auth-and-book-discovery-surface-refresh.md`: refresh `app/page.tsx`, `app/signin/page.tsx`, `/books/search`, `/books/[googleVolumeId]`, and the shared books UI; migrate search-mode controls to clearer shadcn patterns; redesign result cards, filter grouping, and loading states; replace the custom add-book modal treatment with responsive Dialog and Drawer behavior while keeping the current add-to-clubs and add-to-shelves flows intact. Acceptance: landing, sign-in, search, and book detail feel visually cohesive with the new system and preserve all current search and add-book behavior.
- `task-04-clubs-threads-shelves-profile-and-review-surface-migration.md`: migrate the remaining authenticated product surfaces to the new system, including clubs index and detail pages, board and members views, manage pages, thread list and thread detail pages, shelves pages, `/me`, `/me/reviewed`, onboarding/profile surfaces, and review editor surfaces; use shared headers, cards, separators, tabs, dialogs, drawers, skeletons, and empty states; keep club board mobile tabs and use a stronger desktop board layout. Acceptance: Milestones 2 through 5 retain the same capabilities with cleaner and more consistent UI across all major routes.
- `task-05-quality-gates-and-regression-coverage.md`: harden the migration with regression coverage and final verification; extend Playwright for protected nav, profile dropdown, mobile bottom nav, search mode switching, add-book dialog/drawer behavior, signup surface reachability, club board navigation, thread creation flows, shelf flows, review flows, and toast feedback; run the full project quality gates. Acceptance: the design migration ships without regressing onboarding, books, clubs, threads, shelves, or review workflows.

## Test Plan

- Add or update Playwright assertions for keyboard navigation, focus visibility, responsive nav behavior, dialog/drawer behavior, and toast feedback.
- Treat desktop and mobile reachability as milestone gates: no horizontal scrolling on primary routes, no hidden critical actions, and all existing flows remain usable with keyboard and touch input.

- Milestone 6 is visual and structural only; it should not introduce new business features, schema changes, or route changes.
- `docs/tasks/milestone-6/` is the intended target path because that matches the milestone layout after Milestone 5 ships the beta-onboarding work.
