# Task 03: Membership and Invitation Flow

## Goal
Implement the private-club membership path and the admin tools needed to manage invite links.

## Scope
- Implement `/clubs/[clubId]/invite` as an admin-only page.
- Add invite creation for private clubs using email as the primary target:
  - accept an email address
  - normalize and validate it
  - hash a generated token before storage
  - set a default 7-day expiry
- Expose a copyable invite URL in the UI after invite creation.
- Add invite management affordances for:
  - viewing pending invites
  - revoking pending invites
  - showing accepted or expired state
- Add a tokenized accept-invite entry point and `acceptInvite(token)` mutation.
- When an invite is accepted:
  - verify token validity and expiry
  - ensure the current signed-in user matches the invited email or invited user id
  - create membership as `MEMBER` if it does not already exist
  - mark the invitation as `ACCEPTED`

## Implementation Notes
- Email delivery is out of scope for Milestone 2. Copy-link UX is the required deliverable.
- Existing members should not be reinvited, and duplicate pending invites should be blocked cleanly.
- For public clubs, the invite page can exist but should primarily support private-club administration.
- Keep invite acceptance idempotent so opening the same valid link twice does not create duplicate memberships.

## Acceptance Criteria
- Only `OWNER` or `ADMIN` can create or revoke invites.
- Invite tokens are never stored in raw form in the database.
- Expired, revoked, and already accepted invites are handled with explicit user-facing states.
- Private clubs cannot be joined through the public join action.
- Accepting a valid invite results in membership and club access without manual DB intervention.

## Expected Touchpoints
- `app/(protected)/clubs/[clubId]/invite/page.tsx`
- `app/(protected)/clubs/invitations/[token]/page.tsx` or equivalent
- `app/(protected)/clubs/actions.ts` or equivalent
- `components/clubs/invite-*`
- `lib/clubs/repository.ts`
