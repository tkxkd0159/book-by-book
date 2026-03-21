# Task 01: User and Admin Identity Foundation

## Goal
Add the schema, shared validation, repository contracts, and identity helpers needed for every Milestone 5 public-user onboarding, internal-admin auth, invitation-code, sharing, and invite flow.

## Scope
- Extend the app-facing database shape and domain contracts for public users:
  - `nickname`
  - `gender`
  - `countryCode`
  - `favoriteGenres`
  - `signupCompletedAt`
- Extend the `users` model for internal admins with a nullable `passwordHash` used only for `provider = 'internal'`.
- Add the schema migration and source-of-truth schema updates needed to persist:
  - the new public-user profile fields on `bookapp.users`
  - internal admin password-hash support on `bookapp.users`
  - `invitation_codes`
  - `invitation_code_redemptions`
- Define shared validation and normalization helpers for:
  - nickname format and uniqueness
  - gender enum parsing
  - ISO country selection
  - favorite-genre allowlist validation
  - internal admin email normalization
  - invitation-code hashing and lookup inputs
- Define shared domain contracts for:
  - `InvitationCodePurpose`
  - `InvitationCodeRecord`
  - `InvitationCodeRedemptionRecord`
  - public user vs internal admin session identity
- Define shared status helpers for invitation-code lifecycle evaluation:
  - active
  - inactive
  - expired
  - exhausted
- Update auth and user repository contracts so app identity no longer depends on provider email for normal signed-in flows.

## Implementation Notes
- Keep the public profile fields and internal password hash on `bookapp.users`; do not introduce a separate profile table or admin table in Milestone 5.
- `signup_completed_at` remains the source of truth for whether a public signed-in user can use the reader app.
- Internal admins are represented by:
  - `provider = 'internal'`
  - `provider_user_id = normalized email`
  - bcrypt-compatible password-hash verification
- Internal admins are manually created in Supabase UI and are not provisioned by the app.
- OAuth-linked public users still use `auth_accounts`; internal credentials auth can resolve directly from `users`.
- Internal admin records should not require `auth_accounts` rows in Milestone 5.
- This task should document the exact manual Supabase bootstrap fields for internal admins:
  - `provider`
  - `provider_user_id`
  - `email`
  - `password_hash`
  - optional `name`
- Invitation codes must be stored hashed and modeled for future purposes even though only `BETA_SIGNUP` is redeemed in this milestone.
- `maxUses = null` means unlimited use; `expiresAt = null` means no expiry.
- Successful redemption count is derived from `invitation_code_redemptions`; failed validation attempts do not create redemption rows.

## Acceptance Criteria
- The database schema and app-facing types expose all required Milestone 5 public-user, internal-admin, and invitation-code fields.
- Shared validation covers nickname normalization, allowed genre values, required country/gender selection, internal admin auth inputs, and invitation-code hashing contracts.
- Reusable repository helpers can distinguish incomplete public users, completed public users, and internal admins without route-local duplication.
- Shared display helpers make nickname the first-class reader-facing identity.
- Shared code-management types are stable enough to support future invitation-code purposes without revisiting the schema shape.
- Manual internal-admin bootstrap requirements are explicit enough that implementation does not need a second design pass for Supabase setup.

## Expected Touchpoints
- `db/schema/data.sql`
- `db/migrations/*`
- `types/db/index.ts`
- `lib/auth/*`
- `lib/invitation-codes/*`
- `tests/unit/auth*.test.ts`
- invitation-code validation and repository helpers
