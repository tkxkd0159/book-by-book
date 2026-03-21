# Task 03: Internal Admin Auth and Invitation Code Management

## Goal
Add the internal-only auth path and admin surface needed to manage invitation codes for beta signup and future uses.

## Scope
- Add `/admin/signin` for internal admin email/password login.
- Add `/admin` as a lightweight landing route that redirects to `/admin/invitation-codes`.
- Configure Auth.js Credentials auth for internal users stored with `provider = 'internal'`.
- Add internal-only route protection for `/admin/*`.
- Add `/admin/invitation-codes` with the required Milestone 5 flows:
  - list codes with purpose, label, status, usage count, expiry, max uses, and creator
  - create a system-generated code with purpose, label, optional expiry, and optional max uses
  - activate/deactivate a code
  - show usage details or redemption history sufficient to explain inactive or exhausted state
- Show the raw invitation code only once at creation time while persisting only the hash.
- Ensure public users cannot access admin routes and internal admins do not flow into public signup or reader-facing routes.

## Implementation Notes
- Internal admins are manually created in Supabase UI; Milestone 5 does not add in-app admin-user creation.
- Internal credentials auth must not create users; it only resolves existing `provider = 'internal'` users and verifies the stored password hash.
- Internal users should land on `/admin/invitation-codes` after successful sign-in.
- Failed `/admin/signin` attempts must be throttled with shared rate-limit infrastructure:
  - email+IP default 5 failures per 900 seconds
  - IP-only default 20 failures per 900 seconds
- Invitation-code management is future-ready through `purpose`, optional expiry, and optional max uses, but only `BETA_SIGNUP` redemption is implemented in Milestone 5.
- The admin route contract can stay compact; usage details may be inline on `/admin/invitation-codes` instead of requiring a second admin detail route.
- In Milestone 5, code creation UI can expose `purpose` as a fixed single-option control or a read-only value so implementation does not need a multi-purpose admin UX yet.
- Admins can activate/deactivate codes, but editing a code’s raw value, expiry, or max uses after creation is out of scope in Milestone 5.
- The list surface should show derived status, not just raw `isActive`, so exhausted and expired codes are immediately understandable.
- Raw invitation codes should be generated as readable high-entropy uppercase codes in `XXXXX-XXXXX-XXXXX-XXXXX` format.

## Acceptance Criteria
- Internal admins can authenticate successfully with email/password through `/admin/signin`.
- Invalid credentials and throttled attempts fail cleanly without creating or mutating users.
- `/admin/invitation-codes` lets internal admins create, activate/deactivate, and inspect codes and usage data.
- Raw codes are only shown at creation time and are not persisted in plaintext.
- Public users are blocked from `/admin/*`, and internal admins are redirected away from `/signup`.
- Manual internal-admin bootstrap is documented with enough field-level detail to be reproducible through Supabase UI.

## Expected Touchpoints
- `app/admin/signin/page.tsx`
- `app/admin/page.tsx`
- `app/admin/layout.tsx`
- `app/admin/invitation-codes/page.tsx`
- `app/api/auth/[...nextauth]/route.ts`
- `components/admin/*`
- `proxy.ts`
- `lib/auth/*`
- `lib/invitation-codes/*`
- invitation-code repositories, server actions, and tests
