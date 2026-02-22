import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { resolveAuthSecret } from "@/lib/auth/secret";
import { findUserByEmail, upsertGoogleOAuthUser } from "@/lib/auth/users";

function readRequiredEnv(name: "GOOGLE_CLIENT_ID" | "GOOGLE_CLIENT_SECRET") {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for Google sign-in.`);
  }

  return value;
}

export const authOptions: NextAuthOptions = {
  secret: resolveAuthSecret(),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    GoogleProvider({
      clientId: readRequiredEnv("GOOGLE_CLIENT_ID"),
      clientSecret: readRequiredEnv("GOOGLE_CLIENT_SECRET"),
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google" || !user.email) {
        return false;
      }

      try {
        await upsertGoogleOAuthUser({
          email: user.email,
          name: user.name ?? null,
          imageUrl: user.image ?? null,
          providerAccountId: account.providerAccountId,
          accessToken: typeof account.access_token === "string" ? account.access_token : null,
          refreshToken:
            typeof account.refresh_token === "string" ? account.refresh_token : null,
          expiresAt: typeof account.expires_at === "number" ? account.expires_at : null,
          tokenType: typeof account.token_type === "string" ? account.token_type : null,
          scope: typeof account.scope === "string" ? account.scope : null,
          idToken: typeof account.id_token === "string" ? account.id_token : null,
        });
      } catch (error) {
        console.error(error);
        return false;
      }

      return true;
    },
    async jwt({ token, account }) {
      if ((account || !token.userId) && token.email) {
        const dbUser = await findUserByEmail(token.email);
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
