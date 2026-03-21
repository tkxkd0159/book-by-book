# Task 02: Signup Completion and Auth Gating

## Goal
Implement the completed-signup flow so authenticated but incomplete users are routed through `/signup` before they can use the protected app.

## Scope
- Add `/signup` as the authenticated onboarding route for incomplete users.
- Build the signup-completion form for:
  - nickname
  - gender
  - country
  - favorite genres
  - beta invitation code
- Add the `completeSignup({ nickname, gender, countryCode, favoriteGenres, betaInvitationCode, callbackUrl? })` mutation.
- Preserve safe callback URLs from:
  - sign-in redirects
  - invite acceptance entry points
  - direct protected-page hits by incomplete users
- Redirect incomplete users away from protected routes and protected mutations until `signup_completed_at` is set.
- Redirect completed users away from `/signup` to the callback destination or `/books/search`.

## Implementation Notes
- Keep Google OAuth as the only provider for Milestone 5, but treat OAuth and completed signup as separate lifecycle steps.
- The onboarding route should require an authenticated session; signed-out users still go to `/signin`.
- Reuse existing safe-return URL handling patterns rather than accepting arbitrary external redirects.
- Invite links and other protected deep links should survive the onboarding detour by preserving callback intent.
- Sign-out remains available to incomplete users.
- Validation and error states should be explicit and server-enforced, not only client-enforced.

## Acceptance Criteria
- A newly authenticated but incomplete user is redirected to `/signup` before any protected app surface renders.
- Completing signup writes the required profile fields and redirects the user back to the intended destination.
- Protected server actions reject incomplete users consistently.
- Completed users cannot accidentally return to `/signup` as a normal app page.
- Beta code, nickname uniqueness, and favorite-genre requirements are enforced on the server.

## Expected Touchpoints
- `app/signup/page.tsx`
- `app/signin/page.tsx`
- `app/auth/error/page.tsx`
- `app/api/auth/[...nextauth]/route.ts`
- `proxy.ts`
- `lib/auth/server.ts`
- related onboarding server actions and tests
