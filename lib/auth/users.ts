import sql from "@/lib/db";
import type { AuthUser } from "@/types/db";

type UserRow = {
  id: string;
  provider: string;
  providerUserId: string;
  email: string | null;
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
      provider,
      provider_user_id as "providerUserId",
      email::text as email,
      name,
      image_url as "imageUrl"
    from bookapp.users
    where email = ${email}
    order by updated_at desc
    limit 1
  `;

  return user ?? null;
}

export async function findUserById(id: string): Promise<AuthUser | null> {
  const [user] = await sql<UserRow[]>`
    select
      id::text as id,
      provider,
      provider_user_id as "providerUserId",
      email::text as email,
      name,
      image_url as "imageUrl"
    from bookapp.users
    where id = ${id}::uuid
    limit 1
  `;

  return user ?? null;
}

export async function findUserByProviderAccount(
  provider: string,
  providerAccountId: string,
): Promise<AuthUser | null> {
  const [user] = await sql<UserRow[]>`
    select
      users.id::text as id,
      users.provider,
      users.provider_user_id as "providerUserId",
      users.email::text as email,
      users.name,
      users.image_url as "imageUrl"
    from bookapp.users
    join bookapp.auth_accounts on auth_accounts.user_id = users.id
    where auth_accounts.provider = ${provider}
      and auth_accounts.provider_account_id = ${providerAccountId}
    limit 1
  `;

  return user ?? null;
}

export async function findUserByProviderIdentity(
  provider: string,
  providerUserId: string,
): Promise<AuthUser | null> {
  const [user] = await sql<UserRow[]>`
    select
      id::text as id,
      provider,
      provider_user_id as "providerUserId",
      email::text as email,
      name,
      image_url as "imageUrl"
    from bookapp.users
    where provider = ${provider}
      and provider_user_id = ${providerUserId}
    limit 1
  `;

  return user ?? null;
}

export async function upsertGoogleOAuthUser(
  input: UpsertGoogleOAuthUserInput,
): Promise<AuthUser> {
  const [user] = await sql<UserRow[]>`
    insert into bookapp.users (provider, provider_user_id, email, name, image_url)
    values ('google', ${input.providerAccountId}, ${input.email}, ${input.name}, ${input.imageUrl})
    on conflict (provider, provider_user_id)
    do update set
      email = coalesce(excluded.email, bookapp.users.email),
      name = coalesce(excluded.name, bookapp.users.name),
      image_url = coalesce(excluded.image_url, bookapp.users.image_url),
      updated_at = now()
    returning
      id::text as id,
      provider,
      provider_user_id as "providerUserId",
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
