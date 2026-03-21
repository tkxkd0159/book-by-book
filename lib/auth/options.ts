import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import { env } from "@/lib/env";
import { isAuthFlowError } from "@/lib/auth/errors";
import {
  INTERNAL_AUTH_PROVIDER,
  GOOGLE_AUTH_PROVIDER,
} from "@/lib/auth/identity";
import { authorizeInternalAdminCredentials } from "@/lib/auth/internal-auth";
import {
  findUserById,
  findUserByProviderAccount,
  upsertGoogleOAuthUser,
} from "@/lib/auth/users";
import type { AuthUser } from "@/types/db";

const SESSION_MAX_AGE_SECONDS = 14 * 24 * 60 * 60;
const googleOAuthEnv = env.googleOAuth;
const runtimeEnv = env.runtime;

function applyDbUserToToken(token: Record<string, unknown>, user: AuthUser) {
  token.userId = user.id;
  token.provider = user.provider;
  token.nickname = user.nickname;
  token.isInternalAdmin = user.isInternalAdmin;
  token.isSignupComplete = user.isSignupComplete;
  token.sessionIdentity = user.sessionIdentity;
  return token;
}

function tokenNeedsDbRefresh(token: Record<string, unknown>) {
  return (
    typeof token.userId === "string" &&
    (
      typeof token.provider !== "string" ||
      typeof token.isInternalAdmin !== "boolean" ||
      typeof token.isSignupComplete !== "boolean" ||
      typeof token.sessionIdentity !== "string" ||
      !("nickname" in token)
    )
  );
}

export const authOptions: NextAuthOptions = {
  debug: runtimeEnv.isDevelopment,
  secret: env.auth.secret,
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  jwt: {
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  pages: {
    signIn: "/signin",
    error: "/auth/error",
  },
  providers: [
    GoogleProvider({
      clientId: googleOAuthEnv.clientId,
      clientSecret: googleOAuthEnv.clientSecret,
    }),
    CredentialsProvider({
      id: INTERNAL_AUTH_PROVIDER,
      name: "Internal Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: authorizeInternalAdminCredentials,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) {
        return false;
      }

      try {
        switch (account?.provider) {
          case GOOGLE_AUTH_PROVIDER:
            await upsertGoogleOAuthUser({
              email: user.email,
              name: user.name ?? null,
              imageUrl: user.image ?? null,
              providerAccountId: account.providerAccountId,
              accessToken:
                typeof account.access_token === "string"
                  ? account.access_token
                  : null,
              refreshToken:
                typeof account.refresh_token === "string"
                  ? account.refresh_token
                  : null,
              expiresAt:
                typeof account.expires_at === "number"
                  ? account.expires_at
                  : null,
              tokenType:
                typeof account.token_type === "string"
                  ? account.token_type
                  : null,
              scope: typeof account.scope === "string" ? account.scope : null,
              idToken:
                typeof account.id_token === "string" ? account.id_token : null,
            });
            break;
          case INTERNAL_AUTH_PROVIDER:
            break;
          default:
            break;
        }
      } catch (error) {
        console.error(error);

        if (
          account?.provider === GOOGLE_AUTH_PROVIDER &&
          isAuthFlowError(error) &&
          error.code === "CONFLICT"
        ) {
          return "/auth/error?error=EmailReserved";
        }

        return false;
      }

      return true;
    },
    async jwt({ token, account, user }) {
      if (
        account?.provider &&
        account.provider !== INTERNAL_AUTH_PROVIDER &&
        account.providerAccountId
      ) {
        const dbUser = await findUserByProviderAccount(
          account.provider,
          account.providerAccountId,
        );
        if (dbUser) {
          return applyDbUserToToken(token, dbUser);
        }
      }

      if (
        account?.provider === INTERNAL_AUTH_PROVIDER &&
        typeof user?.id === "string"
      ) {
        const dbUser = await findUserById(user.id);
        if (dbUser) {
          return applyDbUserToToken(token, dbUser);
        }
      }

      const tokenUserId =
        typeof token.userId === "string" ? token.userId : null;

      if (tokenUserId && tokenNeedsDbRefresh(token)) {
        const dbUser = await findUserById(tokenUserId);
        if (dbUser) {
          return applyDbUserToToken(token, dbUser);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.userId === "string") {
        session.user.id = token.userId;
        session.user.provider =
          typeof token.provider === "string" ? token.provider : undefined;
        session.user.nickname =
          typeof token.nickname === "string" ? token.nickname : null;
        session.user.isInternalAdmin = token.isInternalAdmin === true;
        session.user.isSignupComplete = token.isSignupComplete === true;
        session.user.sessionIdentity =
          typeof token.sessionIdentity === "string"
            ? token.sessionIdentity
            : undefined;
      }

      return session;
    },
  },
};
