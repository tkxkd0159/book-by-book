# Task 02: Signup Completion and Public App Auth Gating

## Goal
Implement the completed-signup flow so authenticated but incomplete public users are routed through `/signup` before they can use the reader-facing app.

## Scope
- Add `/signup` as the authenticated onboarding route for incomplete public users.
- Build the signup-completion form for:
  - nickname
  - gender
  - country
  - favorite genres
  - invitation code
- Add the `completeSignup({ nickname, gender, countryCode, favoriteGenres, invitationCode, callbackUrl? })` mutation.
- Validate and redeem an active `BETA_SIGNUP` invitation code transactionally during signup completion.
- Preserve safe callback URLs from:
  - sign-in redirects
  - invite acceptance entry points
  - direct protected-page hits by incomplete public users
- Redirect incomplete public users away from reader-facing protected routes and protected mutations until `signup_completed_at` is set.
- Redirect completed public users away from `/signup` to the callback destination or `/books/search`.
- Ensure internal admins never enter the public signup flow and are redirected to `/admin/invitation-codes` instead.

## Implementation Notes
- Keep Google OAuth as the only public-user provider for Milestone 5, but treat OAuth and completed signup as separate lifecycle steps.
- The onboarding route should require an authenticated public session; signed-out users still go to `/signin`.
- Internal admins should never use `/signup`; route guards should redirect them to `/admin/invitation-codes`.
- Reuse existing safe-return URL handling patterns rather than accepting arbitrary external redirects.
- Invite links and other protected deep links should survive the onboarding detour by preserving callback intent.
- Sign-out remains available to incomplete public users.
- Invitation-code redemption should record audit history and enforce inactive, expired, exhausted, and wrong-purpose rejections on the server.
- A successful signup redemption should consume one available use exactly once, even under concurrent submission attempts.

## Acceptance Criteria
- A newly authenticated but incomplete public user is redirected to `/signup` before any reader-facing app surface renders.
- Completing signup writes the required profile fields, marks signup complete, redeems the code, and redirects the user back to the intended destination.
- Protected reader-facing server actions reject incomplete public users consistently.
- Completed public users cannot accidentally return to `/signup` as a normal app page.
- Invalid, inactive, expired, exhausted, and wrong-purpose invitation codes are rejected with clear server-enforced behavior.
- Internal admins cannot complete public signup and are redirected back to the admin panel instead.

## Expected Touchpoints
- `app/signup/page.tsx`
- `app/signin/page.tsx`
- `app/auth/error/page.tsx`
- `app/api/auth/[...nextauth]/route.ts`
- `proxy.ts`
- `lib/auth/server.ts`
- signup-completion repository helpers and tests
- signup-completion server actions and tests
