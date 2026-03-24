import sql from "@/lib/db";
import { syncCachedAuthUser } from "@/lib/auth/user-cache";
import { AuthFlowError } from "@/lib/auth/errors";
import { INTERNAL_AUTH_PROVIDER } from "@/lib/auth/identity";
import { logRepositoryOperation } from "@/lib/repository-logging";
import {
  parseCountryCode,
  parseFavoriteGenres,
  parseNickname,
  parseUserGender,
} from "@/lib/auth/signup";
import {
  hashInvitationCode,
  resolveInvitationCodeStatus,
} from "@/lib/invitation-codes/core";
import type { AuthUser } from "@/types/auth";

type SignupUserRow = {
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
};

type InvitationCodeLookupRow = {
  id: string;
  purpose: string;
  isActive: boolean;
  expiresAt: Date | null;
  maxUses: number | null;
};

type CompleteSignupInput = {
  countryCode: string;
  favoriteGenres: readonly string[];
  gender: string;
  invitationCode: string;
  nickname: string;
  userId: string;
};

const REPOSITORY_MODULE = "auth.onboarding";

function mapCompletedUser(row: SignupUserRow): AuthUser {
  return {
    id: row.id,
    provider: row.provider,
    providerUserId: row.providerUserId,
    email: row.email,
    name: row.name,
    imageUrl: row.imageUrl,
    nickname: row.nickname,
    gender: parseUserGender(row.gender),
    countryCode: row.countryCode,
    favoriteGenres: parseFavoriteGenres(row.favoriteGenres ?? []),
    signupCompletedAt: row.signupCompletedAt,
  };
}

export async function completeSignup(
  input: CompleteSignupInput,
): Promise<AuthUser> {
  return logRepositoryOperation(
    {
      context: {
        countryCode: input.countryCode,
        favoriteGenreCount: input.favoriteGenres.length,
        gender: input.gender,
        userId: input.userId,
      },
      module: REPOSITORY_MODULE,
      operation: "completeSignup",
      transactional: true,
    },
    async () => {
      const nickname = parseNickname(input.nickname);
      const gender = parseUserGender(input.gender);
      const countryCode = parseCountryCode(input.countryCode);
      const favoriteGenres = parseFavoriteGenres(input.favoriteGenres);
      const invitationCodeHash = hashInvitationCode(input.invitationCode);

      try {
        const completedUser = await sql.begin(async (tx) => {
          const query = tx as unknown as typeof sql;

          const [user] = await query<SignupUserRow[]>`
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
              signup_completed_at as "signupCompletedAt"
            from bookapp.users
            where id = ${input.userId}::uuid
            for update
          `;

          if (!user) {
            throw new AuthFlowError("UNAUTHORIZED", "Sign in to continue.");
          }

          if (user.provider === INTERNAL_AUTH_PROVIDER) {
            throw new AuthFlowError(
              "FORBIDDEN",
              "Internal admins cannot complete reader signup.",
            );
          }

          if (user.signupCompletedAt) {
            throw new AuthFlowError("CONFLICT", "Signup is already complete.");
          }

          const [invitationCode] = await query<InvitationCodeLookupRow[]>`
            select
              invitation_codes.id::text as id,
              invitation_codes.purpose,
              invitation_codes.is_active as "isActive",
              invitation_codes.expires_at as "expiresAt",
              invitation_codes.max_uses as "maxUses"
            from bookapp.invitation_codes
            where invitation_codes.code_hash = ${invitationCodeHash}
              and invitation_codes.purpose = 'BETA_SIGNUP'
            for update
          `;

          if (!invitationCode) {
            throw new AuthFlowError(
              "VALIDATION",
              "Enter a valid beta invitation code.",
            );
          }

          const [redemptionCountResult] = await query<
            { redemptionCount: number }[]
          >`
            select count(*)::int as "redemptionCount"
            from bookapp.invitation_code_redemptions
            where code_id = ${invitationCode.id}::uuid
          `;

          const invitationCodeStatus = resolveInvitationCodeStatus({
            ...invitationCode,
            redemptionCount: redemptionCountResult?.redemptionCount ?? 0,
          });
          switch (invitationCodeStatus) {
            case "INACTIVE":
              throw new AuthFlowError(
                "FORBIDDEN",
                "This invitation code is inactive.",
              );
            case "EXPIRED":
              throw new AuthFlowError(
                "FORBIDDEN",
                "This invitation code has expired.",
              );
            case "EXHAUSTED":
              throw new AuthFlowError(
                "FORBIDDEN",
                "This invitation code has no uses remaining.",
              );
            default:
              break;
          }

          const [updatedUser] = await query<SignupUserRow[]>`
            update bookapp.users
            set
              nickname = ${nickname},
              gender = ${gender},
              country_code = ${countryCode},
              favorite_genres = ${sql.array([...favoriteGenres])},
              signup_completed_at = now(),
              updated_at = now()
            where id = ${input.userId}::uuid
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
              signup_completed_at as "signupCompletedAt"
          `;

          await query`
            insert into bookapp.invitation_code_redemptions (
              code_id,
              user_id
            )
            values (
              ${invitationCode.id}::uuid,
              ${input.userId}::uuid
            )
          `;

          if (!updatedUser) {
            throw new AuthFlowError("UNAUTHORIZED", "Sign in to continue.");
          }

          return mapCompletedUser(updatedUser);
        });

        await syncCachedAuthUser(completedUser.id, completedUser);
        return completedUser;
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "23505" &&
          "constraint_name" in error &&
          error.constraint_name === "users_nickname_uniq"
        ) {
          throw new AuthFlowError("CONFLICT", "This nickname is already taken.");
        }

        throw error;
      }
    },
  );
}
