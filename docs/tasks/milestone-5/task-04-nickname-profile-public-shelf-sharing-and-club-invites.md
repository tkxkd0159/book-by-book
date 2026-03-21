# Task 04: Nickname Profile, Public Shelf Sharing, and Club Invites

## Goal
Make nickname the default reader-facing identity, switch public shelf sharing from userId-based URLs to nickname-based URLs, and replace the email-targeted private-club invite flow with nickname targeting.

## Scope
- Update profile surfaces so `/me` reflects the completed Book by Book profile:
  - nickname as the primary identity
  - gender
  - country
  - favorite genres
  - provider email only as secondary account metadata
- Replace provider name/email as the default public display identity across:
  - profile menu
  - club member summaries
  - thread author labels
  - review author labels
  - shelf owner labels
- Change public shelf path generation from `/users/[userId]/shelves/[shelfId]` to `/users/[nickname]/shelves/[shelfId]`.
- Update public shelf route loading so nickname resolves to the owner user first, then reuses the same shelf visibility and ownership checks.
- Update private-club invite creation UI to accept nickname instead of email.
- Resolve the entered nickname to an existing signed-up public user on the server and create the invite against `invitedUserId`.
- Update invite management and acceptance surfaces so target identity is shown by nickname and acceptance matches by signed-in user id rather than provider email.

## Implementation Notes
- Keep `shelfId` in the public shelf URL so Milestone 5 changes only the owner segment, not the shelf identifier model.
- Do not add a general public profile page in this milestone; only the public shelf route changes.
- Gender, country, and favorite genres remain owner-profile data; milestone scope does not require surfacing those fields publicly outside `/me`.
- Invitation codes and private club invites are separate domains and should not be coupled in repository or UI behavior.
- Inviting someone who has not completed signup is out of scope; the club-invite flow should fail clearly when the nickname does not map to a signed-up public user.
- Duplicate pending club invites should be blocked per `clubId + invitedUserId`.
- Invite acceptance UI and copy should stop referring to email entirely and should identify the invite target by nickname or a generic targeted-user message.

## Acceptance Criteria
- `/me` clearly shows nickname as the primary Book by Book identity and surfaces the new profile fields.
- Shared UI components and read surfaces display nickname consistently instead of provider name/email.
- Public shelf links and route helpers generate nickname-based paths, and public shelf reads continue to enforce the same visibility rules after nickname lookup.
- Club admins create private invites by nickname, not email.
- Private-club invite creation fails with a clear error when the nickname does not exist, is incomplete, or already belongs to a club member.
- Accepting a valid private-club invite works only for the targeted signed-in public user and remains idempotent.
- Reader-facing invite pages and member/profile surfaces no longer rely on provider email as the visible identity fallback when nickname exists.

## Expected Touchpoints
- `app/(protected)/me/page.tsx`
- `app/(protected)/users/[nickname]/shelves/[shelfId]/page.tsx` or equivalent
- `app/(protected)/clubs/actions.ts`
- `app/(protected)/clubs/[clubId]/manage/invite/page.tsx`
- `app/(protected)/clubs/invitations/[token]/page.tsx`
- `lib/shelves/*`
- `lib/clubs/*`
- reader-facing identity presentation helpers and tests
