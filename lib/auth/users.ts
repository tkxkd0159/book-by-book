import sql from "@/lib/db";
import type { AuthUser } from "@/types/db";

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  imageUrl: string | null;
};

type UpsertGoogleOAuthUserInput = {
  email: string;
  name: string | null;
  imageUrl: string | null;
  providerAccountId: string;
  refreshToken: string | null;
  accessToken: string | null;
  expiresAt: number | null;
  tokenType: string | null;
  scope: string | null;
  idToken: string | null;
};

export async function findUserByEmail(email: string): Promise<AuthUser | null> {
  const [user] = await sql<UserRow[]>`
    select
      id::text as id,
      email::text as email,
      name,
      image_url as "imageUrl"
    from bookapp.users
    where email = ${email}
    limit 1
  `;

  return user ?? null;
}

export async function upsertGoogleOAuthUser(
  input: UpsertGoogleOAuthUserInput,
): Promise<AuthUser> {
  const [user] = await sql<UserRow[]>`
    insert into bookapp.users (email, name, image_url)
    values (${input.email}, ${input.name}, ${input.imageUrl})
    on conflict (email)
    do update set
      name = coalesce(excluded.name, bookapp.users.name),
      image_url = coalesce(excluded.image_url, bookapp.users.image_url),
      updated_at = now()
    returning
      id::text as id,
      email::text as email,
      name,
      image_url as "imageUrl"
  `;

  await sql`
    insert into bookapp.auth_accounts (
      user_id,
      type,
      provider,
      provider_account_id,
      refresh_token,
      access_token,
      expires_at,
      token_type,
      scope,
      id_token
    )
    values (
      ${user.id},
      'oauth',
      'google',
      ${input.providerAccountId},
      ${input.refreshToken},
      ${input.accessToken},
      ${input.expiresAt},
      ${input.tokenType},
      ${input.scope},
      ${input.idToken}
    )
    on conflict (provider, provider_account_id)
    do update set
      user_id = excluded.user_id,
      refresh_token = coalesce(excluded.refresh_token, bookapp.auth_accounts.refresh_token),
      access_token = coalesce(excluded.access_token, bookapp.auth_accounts.access_token),
      expires_at = coalesce(excluded.expires_at, bookapp.auth_accounts.expires_at),
      token_type = coalesce(excluded.token_type, bookapp.auth_accounts.token_type),
      scope = coalesce(excluded.scope, bookapp.auth_accounts.scope),
      id_token = coalesce(excluded.id_token, bookapp.auth_accounts.id_token),
      updated_at = now()
  `;

  return user;
}
