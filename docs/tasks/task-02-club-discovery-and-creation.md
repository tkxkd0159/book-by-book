# Task 02: Club Discovery and Creation

## Goal
Ship the initial club route tree so authenticated users can browse clubs, create a club, and land on a usable club home shell.

## Scope
- Add a `Clubs` entry point to the protected navigation.
- Implement `/clubs` with two sections:
  - `My Clubs`: clubs where the current user is already a member
  - `Discover`: public clubs the current user has not joined yet
- Implement `/clubs/new` with a form for:
  - name
  - description
  - visibility (`PUBLIC` or `PRIVATE`)
- Add the server action for `createClub(...)`:
  - validate input
  - create the club
  - create the creator's `OWNER` membership in the same transaction
  - redirect to `/clubs/[clubId]`
- Add a minimal `/clubs/[clubId]` shell that can render club metadata, current membership state, and placeholder section containers before Task 04 fills in the full section experience.
- Add the public join action used from `/clubs` and the club header.

## Implementation Notes
- Discovery should not leak private clubs; they only appear to members.
- Club cards should surface visibility, member count, and whether the current user is already a member.
- Treat public join as immediate membership for this milestone. If approval-based join is later preferred, it needs a separate product decision and schema/workflow update.
- Reuse the existing protected layout patterns instead of introducing a separate auth gate.

## Acceptance Criteria
- Any authenticated user can create a public or private club.
- Club creation always produces an `OWNER` membership for the creator.
- `/clubs` clearly separates "joined" and "discoverable" clubs.
- Public clubs can be joined from the UI, and repeated joins are handled gracefully.
- Private clubs are never shown in public discovery or joinable without an invite.

## Expected Touchpoints
- `app/(protected)/layout.tsx`
- `app/(protected)/clubs/page.tsx`
- `app/(protected)/clubs/new/page.tsx`
- `app/(protected)/clubs/[clubId]/page.tsx`
- `app/(protected)/clubs/actions.ts` or equivalent
- `components/clubs/*`
