# Task 04: Nickname-Based Club Invitation Flow

## Goal
Replace the email-targeted private-club invite flow with a nickname-targeted flow that resolves to the invited signed-up user.

## Scope
- Update private-club invite creation UI to accept nickname instead of email.
- Resolve the entered nickname to an existing signed-up user on the server and create the invite against `invitedUserId`.
- Update invite management surfaces so history and status messaging show the invited nickname instead of email.
- Update invite acceptance rules so matching is based on the signed-in user id rather than provider email.
- Preserve the current copy-link workflow, hashed tokens, default expiry, revoke flow, and idempotent acceptance behavior.

## Implementation Notes
- Inviting someone who has not completed signup is out of scope; the flow should fail clearly when the nickname does not map to a signed-up user.
- Duplicate pending invites should be blocked per `clubId + invitedUserId`.
- Accepted, revoked, expired, and already-member states should remain explicit in both repository errors and UI copy.
- Keep invite acceptance route shape and token hashing behavior unchanged where possible so Milestone 5 only changes the target identity model.
- Remove email-specific validation and acceptance logic from the milestone implementation and documentation.

## Acceptance Criteria
- Club admins create private invites by nickname, not email.
- Invite creation fails with a clear error when the nickname does not exist, is incomplete, or already belongs to a club member.
- Invite history and acceptance pages show nickname-based target identity.
- Accepting a valid invite works only for the targeted signed-in user and remains idempotent.
- Existing private-club invitation lifecycle behavior stays intact after the identity-model change.

## Expected Touchpoints
- `app/(protected)/clubs/actions.ts`
- `app/(protected)/clubs/[clubId]/manage/invite/page.tsx`
- `app/(protected)/clubs/invitations/[token]/page.tsx`
- `components/clubs/club-invitations-section.tsx`
- `lib/clubs/repository.ts`
- `lib/clubs/validation.ts`
- related invite tests
