# Task 03: Internal Admin Auth and Invitation Code Management

## Goal
Add the internal-only auth path and admin surface needed to manage invitation codes for beta signup and future uses.

## Scope
- Add `/admin/signin` for internal admin email/password login.
- Configure Auth.js Credentials auth for internal users stored with `provider = 'internal'`.
- Add internal-only route protection for `/admin/*`.
- Add `/admin/invitation-codes` with the required Milestone 5 flows:
  - list codes with purpose, label, status, usage count, expiry, max uses, and creator
  - create a code with purpose, label, optional expiry, and optional max uses
  - activate/deactivate a code
  - show usage details or redemption history sufficient to explain inactive or exhausted state
- Show the raw invitation code only once at creation time while persisting only the hash.
- Ensure public users cannot access admin routes and internal admins do not flow into public signup or reader-facing routes.

## Implementation Notes
- Internal admins are manually created in Supabase UI; Milestone 5 does not add in-app admin-user creation.
- Internal credentials auth must not create users; it only resolves existing `provider = 'internal'` users and verifies the stored password hash.
- Internal users should land on `/admin/invitation-codes` after successful sign-in.
- Invitation-code management is future-ready through `purpose`, optional expiry, and optional max uses, but only `BETA_SIGNUP` redemption is implemented in Milestone 5.
- The admin route contract can stay compact; usage details may be inline on `/admin/invitation-codes` instead of requiring a second admin detail route.

## Acceptance Criteria
- Internal admins can authenticate successfully with email/password through `/admin/signin`.
- Invalid credentials fail cleanly without creating or mutating users.
- `/admin/invitation-codes` lets internal admins create, activate/deactivate, and inspect codes and usage data.
- Raw codes are only shown at creation time and are not persisted in plaintext.
- Public users are blocked from `/admin/*`, and internal admins are redirected away from `/signup`.

## Expected Touchpoints
- `app/admin/signin/page.tsx`
- `app/admin/invitation-codes/page.tsx`
- `app/api/auth/[...nextauth]/route.ts`
- `proxy.ts`
- `lib/auth/*`
- invitation-code repositories, server actions, and tests
