import sql from "@/lib/db";
import { syncCachedAuthUser } from "@/lib/auth/user-cache";
import { AuthFlowError } from "@/lib/auth/errors";
import {
  getUserDisplayName,
  INTERNAL_AUTH_PROVIDER,
  isInternalAuthProvider,
  resolveAppSessionIdentity,
} from "@/lib/auth/identity";
import { normalizeInternalAdminEmail } from "@/lib/auth/internal";
import {
  coerceFavoriteGenres,
  coerceUserGender,
  normalizeNickname,
} from "@/lib/auth/signup";
import { logRepositoryOperation } from "@/lib/repository-logging";
import type { AuthUser, InternalAdminAuthUser } from "@/types/db";

type UserRow = {
  id: string;
  provider: string;
  providerUserId: string;
  email: string | null;
  name: string | null;
  imageUrl: string | null;
  nickname: string | null;
  gender: string | null;
  countryCode: string | null;
  favoriteGenres: string[] | null;
  signupCompletedAt: Date | null;
  passwordHash: string | null;
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

const REPOSITORY_MODULE = "auth.users";

function mapAuthUser(row: UserRow): AuthUser {
  const sessionIdentity = resolveAppSessionIdentity(row);

  return {
    id: row.id,
    provider: row.provider,
    providerUserId: row.providerUserId,
    email: row.email,
    name: row.name,
    imageUrl: row.imageUrl,
    nickname: row.nickname,
    gender: coerceUserGender(row.gender),
    countryCode: row.countryCode,
    favoriteGenres: coerceFavoriteGenres(row.favoriteGenres),
    signupCompletedAt: row.signupCompletedAt,
    isInternalAdmin: isInternalAuthProvider(row.provider),
    isSignupComplete: sessionIdentity === "PUBLIC",
    sessionIdentity,
  };
}

function mapInternalAdminAuthUser(row: UserRow): InternalAdminAuthUser {
  return {
    id: row.id,
    provider: row.provider,
    providerUserId: row.providerUserId,
    email: row.email,
    name: row.name,
    imageUrl: row.imageUrl,
    nickname: row.nickname,
    gender: coerceUserGender(row.gender),
    countryCode: row.countryCode,
    favoriteGenres: coerceFavoriteGenres(row.favoriteGenres),
    signupCompletedAt: row.signupCompletedAt,
    passwordHash: row.passwordHash,
    isInternalAdmin: true,
    isSignupComplete: false,
    sessionIdentity: "INTERNAL_ADMIN",
  };
}

export async function findUserByEmail(email: string): Promise<AuthUser | null> {
  return logRepositoryOperation(
    {
      context: { lookup: "email" },
      module: REPOSITORY_MODULE,
      operation: "findUserByEmail",
    },
    async () => {
      const [user] = await sql<UserRow[]>`
        select
          id::text as id,
          provider,
          provider_user_id as "providerUserId",
          email::text as email,
          name,
          image_url as "imageUrl",
          nickname,
          gender,
          country_code as "countryCode",
          favorite_genres as "favoriteGenres",
          signup_completed_at as "signupCompletedAt",
          password_hash as "passwordHash"
        from bookapp.users
        where email = ${email}
        limit 1
      `;

      return user ? mapAuthUser(user) : null;
    },
  );
}

export async function findUserById(id: string): Promise<AuthUser | null> {
  return logRepositoryOperation(
    {
      context: { id },
      module: REPOSITORY_MODULE,
      operation: "findUserById",
    },
    async () => {
      const [user] = await sql<UserRow[]>`
        select
          id::text as id,
          provider,
          provider_user_id as "providerUserId",
          email::text as email,
          name,
          image_url as "imageUrl",
          nickname,
          gender,
          country_code as "countryCode",
          favorite_genres as "favoriteGenres",
          signup_completed_at as "signupCompletedAt",
          password_hash as "passwordHash"
        from bookapp.users
        where id = ${id}::uuid
        limit 1
      `;

      return user ? mapAuthUser(user) : null;
    },
  );
}

export async function findUserByProviderAccount(
  provider: string,
  providerAccountId: string,
): Promise<AuthUser | null> {
  return logRepositoryOperation(
    {
      context: {
        lookup: "providerAccount",
        provider,
      },
      module: REPOSITORY_MODULE,
      operation: "findUserByProviderAccount",
    },
    async () => {
      const [user] = await sql<UserRow[]>`
        select
          users.id::text as id,
          users.provider,
          users.provider_user_id as "providerUserId",
          users.email::text as email,
          users.name,
          users.image_url as "imageUrl",
          users.nickname,
          users.gender,
          users.country_code as "countryCode",
          users.favorite_genres as "favoriteGenres",
          users.signup_completed_at as "signupCompletedAt",
          users.password_hash as "passwordHash"
        from bookapp.users
        join bookapp.auth_accounts on auth_accounts.user_id = users.id
        where auth_accounts.provider = ${provider}
          and auth_accounts.provider_account_id = ${providerAccountId}
        limit 1
      `;

      return user ? mapAuthUser(user) : null;
    },
  );
}

export async function findUserByProviderIdentity(
  provider: string,
  providerUserId: string,
): Promise<AuthUser | null> {
  return logRepositoryOperation(
    {
      context: {
        lookup: "providerIdentity",
        provider,
      },
      module: REPOSITORY_MODULE,
      operation: "findUserByProviderIdentity",
    },
    async () => {
      const [user] = await sql<UserRow[]>`
        select
          id::text as id,
          provider,
          provider_user_id as "providerUserId",
          email::text as email,
          name,
          image_url as "imageUrl",
          nickname,
          gender,
          country_code as "countryCode",
          favorite_genres as "favoriteGenres",
          signup_completed_at as "signupCompletedAt",
          password_hash as "passwordHash"
        from bookapp.users
        where provider = ${provider}
          and provider_user_id = ${providerUserId}
        limit 1
      `;

      return user ? mapAuthUser(user) : null;
    },
  );
}

export async function findPublicUserByNickname(
  nickname: string,
): Promise<AuthUser | null> {
  return logRepositoryOperation(
    {
      context: { lookup: "nickname" },
      module: REPOSITORY_MODULE,
      operation: "findPublicUserByNickname",
    },
    async () => {
      const normalizedNickname = normalizeNickname(nickname);
      if (!normalizedNickname) {
        return null;
      }

      const [user] = await sql<UserRow[]>`
        select
          id::text as id,
          provider,
          provider_user_id as "providerUserId",
          email::text as email,
          name,
          image_url as "imageUrl",
          nickname,
          gender,
          country_code as "countryCode",
          favorite_genres as "favoriteGenres",
          signup_completed_at as "signupCompletedAt",
          password_hash as "passwordHash"
        from bookapp.users
        where provider <> ${INTERNAL_AUTH_PROVIDER}
          and nickname = ${normalizedNickname}
          and signup_completed_at is not null
        limit 1
      `;

      return user ? mapAuthUser(user) : null;
    },
  );
}

export async function findInternalAdminByEmail(
  email: string,
): Promise<InternalAdminAuthUser | null> {
  return logRepositoryOperation(
    {
      context: { lookup: "internalAdminEmail" },
      module: REPOSITORY_MODULE,
      operation: "findInternalAdminByEmail",
    },
    async () => {
      const normalizedEmail = normalizeInternalAdminEmail(email);

      const [user] = await sql<UserRow[]>`
        select
          id::text as id,
          provider,
          provider_user_id as "providerUserId",
          email::text as email,
          name,
          image_url as "imageUrl",
          nickname,
          gender,
          country_code as "countryCode",
          favorite_genres as "favoriteGenres",
          signup_completed_at as "signupCompletedAt",
          password_hash as "passwordHash"
        from bookapp.users
        where provider = ${INTERNAL_AUTH_PROVIDER}
          and provider_user_id = ${normalizedEmail}
        limit 1
      `;

      return user ? mapInternalAdminAuthUser(user) : null;
    },
  );
}

export function getPublicUserIdentityLabel(user: AuthUser) {
  return getUserDisplayName(user);
}

export async function upsertGoogleOAuthUser(
  input: UpsertGoogleOAuthUserInput,
): Promise<AuthUser> {
  return logRepositoryOperation(
    {
      context: {
        hasAccessToken: Boolean(input.accessToken),
        hasExpiresAt: input.expiresAt !== null,
        hasIdToken: Boolean(input.idToken),
        hasImageUrl: Boolean(input.imageUrl),
        hasName: Boolean(input.name),
        hasRefreshToken: Boolean(input.refreshToken),
        provider: "google",
      },
      module: REPOSITORY_MODULE,
      operation: "upsertGoogleOAuthUser",
    },
    async () => {
      let user: UserRow | undefined;

      try {
        [user] = await sql<UserRow[]>`
          insert into bookapp.users (provider, provider_user_id, email, name, image_url)
          values ('google', ${input.providerAccountId}, ${input.email}, ${input.name}, ${input.imageUrl})
          on conflict (provider, provider_user_id)
          do update set
            email = excluded.email,
            name = coalesce(excluded.name, bookapp.users.name),
            image_url = coalesce(excluded.image_url, bookapp.users.image_url),
            updated_at = now()
          returning
            id::text as id,
            provider,
            provider_user_id as "providerUserId",
            email::text as email,
            name,
            image_url as "imageUrl",
            nickname,
            gender,
            country_code as "countryCode",
            favorite_genres as "favoriteGenres",
            signup_completed_at as "signupCompletedAt",
            password_hash as "passwordHash"
        `;
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "23505" &&
          "constraint_name" in error &&
          error.constraint_name === "users_email_uniq"
        ) {
          throw new AuthFlowError(
            "CONFLICT",
            "This email is already reserved for another Book by Book account.",
          );
        }

        throw error;
      }

      if (!user) {
        throw new AuthFlowError(
          "UNAUTHORIZED",
          "Could not create a Google-backed user.",
        );
      }

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

      const authUser = mapAuthUser(user);
      await syncCachedAuthUser(authUser.id, authUser);
      return authUser;
    },
  );
}
