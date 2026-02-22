import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { resolveAuthSecret } from "@/lib/auth/secret";
import {
  findUserByProviderAccount,
  upsertGoogleOAuthUser,
} from "@/lib/auth/users";

function readRequiredEnv(name: "GOOGLE_CLIENT_ID" | "GOOGLE_CLIENT_SECRET") {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for Google sign-in.`);
  }

  return value;
}

export const authOptions: NextAuthOptions = {
  debug: process.env.NODE_ENV === "development",
  secret: resolveAuthSecret(),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/signin",
    error: "/auth/error",
  },
  providers: [
    GoogleProvider({
      clientId: readRequiredEnv("GOOGLE_CLIENT_ID"),
      clientSecret: readRequiredEnv("GOOGLE_CLIENT_SECRET"),
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) {
        return false;
      }

      try {
        switch (account?.provider) {
          case "google":
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
          default:
            break;
        }
      } catch (error) {
        console.error(error);
        return false;
      }

      return true;
    },
    async jwt({ token, account }) {
      if (account?.provider && account.providerAccountId) {
        const dbUser = await findUserByProviderAccount(
          account.provider,
          account.providerAccountId,
        );
        if (dbUser) {
          token.userId = dbUser.id;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.userId === "string") {
        session.user.id = token.userId;
      }

      return session;
    },
  },
};
